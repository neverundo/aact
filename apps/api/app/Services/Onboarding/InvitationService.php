<?php

namespace App\Services\Onboarding;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\Invitation;
use App\Models\ReferrerProfile;
use App\Models\User;
use App\Models\Website;
use App\Notifications\ReferrerInvitationNotification;
use App\Services\Audit\AuditLogger;
use App\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InvitationService
{
    private const string UNAVAILABLE_MESSAGE = 'Invitation is not available.';

    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  list<int>  $websiteIds
     * @return array{invitation: Invitation, plain_token: string}
     */
    public function create(
        User $actor,
        Business $business,
        string $email,
        array $websiteIds,
        ?string $name = null,
        ?string $phone = null,
        ?Request $request = null,
    ): array {
        $websites = Website::query()
            ->where('business_id', $business->id)
            ->whereIn('id', $websiteIds)
            ->get();

        if ($websites->count() !== count(array_unique($websiteIds))) {
            throw ValidationException::withMessages([
                'website_ids' => ['One or more websites are invalid for this business.'],
            ]);
        }

        $normalizedPhone = null;
        if (filled($phone)) {
            $normalizedPhone = PhoneNumber::normalize($phone);
        }

        $plain = Str::random(64);

        $invitation = DB::transaction(function () use ($actor, $business, $email, $name, $normalizedPhone, $plain, $websites) {
            $invitation = Invitation::query()->create([
                'business_id' => $business->id,
                'invited_by_user_id' => $actor->id,
                'email' => Str::lower($email),
                'name' => $name,
                'phone' => $normalizedPhone,
                'token_hash' => hash('sha256', $plain),
                'expires_at' => now()->addHours((int) config('aact.invitations.ttl_hours')),
                'resend_count' => 0,
                'last_sent_at' => now(),
            ]);

            $invitation->websites()->sync($websites->pluck('id')->all());

            return $invitation->load(['business', 'websites']);
        });

        Notification::route('mail', $invitation->email)
            ->notify(new ReferrerInvitationNotification($invitation, $plain));

        $this->audit->log(
            action: 'invitation.created',
            actor: $actor,
            businessId: $business->id,
            entityType: Invitation::class,
            entityId: $invitation->id,
            context: ['email' => $invitation->email],
            request: $request,
        );

        return ['invitation' => $invitation, 'plain_token' => $plain];
    }

    public function preview(string $uuid, string $plainToken): Invitation
    {
        $invitation = $this->findByToken($uuid, $plainToken);

        if (! $invitation->isAcceptable()) {
            throw ValidationException::withMessages([
                'token' => [self::UNAVAILABLE_MESSAGE],
            ]);
        }

        return $invitation->load(['business', 'websites']);
    }

    /**
     * Explicit acceptance — never called from GET.
     */
    public function accept(string $uuid, string $plainToken, User $user, Request $request): BusinessMembership
    {
        $invitation = $this->findByToken($uuid, $plainToken);

        if (! $invitation->isAcceptable()) {
            throw ValidationException::withMessages([
                'token' => [self::UNAVAILABLE_MESSAGE],
            ]);
        }

        if (Str::lower($user->email) !== Str::lower($invitation->email)) {
            throw ValidationException::withMessages([
                'email' => ['Authenticated account email must match the invitation email.'],
            ]);
        }

        if (! $user->hasVerifiedEmail()) {
            throw ValidationException::withMessages([
                'email' => ['Email must be verified before accepting an invitation.'],
            ]);
        }

        $membership = DB::transaction(function () use ($invitation, $user) {
            $locked = Invitation::query()->whereKey($invitation->id)->lockForUpdate()->firstOrFail();

            if (! $locked->isAcceptable()) {
                throw ValidationException::withMessages([
                    'token' => [self::UNAVAILABLE_MESSAGE],
                ]);
            }

            $existing = BusinessMembership::query()
                ->where('business_id', $locked->business_id)
                ->where('user_id', $user->id)
                ->where('role', MembershipRole::Referrer)
                ->first();

            if ($existing !== null) {
                throw ValidationException::withMessages([
                    'membership' => ['A referrer membership already exists for this business.'],
                ]);
            }

            ReferrerProfile::query()->firstOrCreate(
                ['user_id' => $user->id],
                [
                    'display_name' => $locked->name,
                    'phone' => $locked->phone,
                    'phone_verified_at' => null,
                ]
            );

            $membership = BusinessMembership::query()->create([
                'business_id' => $locked->business_id,
                'user_id' => $user->id,
                'role' => MembershipRole::Referrer,
                'status' => MembershipStatus::Pending,
                'invitation_id' => $locked->id,
            ]);

            $membership->websites()->sync($locked->websites()->pluck('websites.id')->all());

            $locked->forceFill([
                'accepted_at' => now(),
                'accepted_by_user_id' => $user->id,
            ])->save();

            return $membership->load(['business', 'websites']);
        });

        $this->audit->log(
            action: 'invitation.accepted',
            actor: $user,
            businessId: $membership->business_id,
            entityType: Invitation::class,
            entityId: $invitation->id,
            request: $request,
        );

        return $membership;
    }

    public function revoke(Invitation $invitation, User $actor, Request $request): void
    {
        if ($invitation->isAccepted()) {
            throw ValidationException::withMessages([
                'invitation' => ['Accepted invitations cannot be revoked.'],
            ]);
        }

        $invitation->forceFill(['revoked_at' => now()])->save();

        $this->audit->log(
            action: 'invitation.revoked',
            actor: $actor,
            businessId: $invitation->business_id,
            entityType: Invitation::class,
            entityId: $invitation->id,
            request: $request,
        );
    }

    /**
     * @return array{invitation: Invitation, plain_token: string}
     */
    public function resend(Invitation $invitation, User $actor, Request $request): array
    {
        if (! $invitation->isAcceptable()) {
            throw ValidationException::withMessages([
                'invitation' => ['Invitation cannot be resent.'],
            ]);
        }

        if ($invitation->resend_count >= (int) config('aact.invitations.max_resends')) {
            throw ValidationException::withMessages([
                'invitation' => ['Resend limit reached.'],
            ]);
        }

        if (
            $invitation->last_sent_at !== null
            && $invitation->last_sent_at->gt(now()->subSeconds((int) config('aact.invitations.resend_cooldown_seconds')))
        ) {
            throw ValidationException::withMessages([
                'invitation' => ['Please wait before resending.'],
            ]);
        }

        $plain = Str::random(64);
        $invitation->forceFill([
            'token_hash' => hash('sha256', $plain),
            'resend_count' => $invitation->resend_count + 1,
            'last_sent_at' => now(),
            'expires_at' => now()->addHours((int) config('aact.invitations.ttl_hours')),
        ])->save();

        Notification::route('mail', $invitation->email)
            ->notify(new ReferrerInvitationNotification($invitation->load('business'), $plain));

        $this->audit->log(
            action: 'invitation.resent',
            actor: $actor,
            businessId: $invitation->business_id,
            entityType: Invitation::class,
            entityId: $invitation->id,
            request: $request,
        );

        return ['invitation' => $invitation->fresh(['business', 'websites']), 'plain_token' => $plain];
    }

    private function findByToken(string $uuid, string $plainToken): Invitation
    {
        $invitation = Invitation::query()->where('uuid', $uuid)->first();

        if ($invitation === null || ! hash_equals($invitation->token_hash, hash('sha256', $plainToken))) {
            throw ValidationException::withMessages([
                'token' => [self::UNAVAILABLE_MESSAGE],
            ]);
        }

        return $invitation;
    }
}
