<?php

namespace App\Services\Integration;

use App\Models\Business;
use App\Models\IntegrationCredential;
use App\Models\User;
use App\Models\Website;
use App\Services\Audit\AuditEntity;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class IntegrationCredentialService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  list<string>  $scopes
     * @return array{credential: IntegrationCredential, plain_token: string, hmac_secret: string}
     */
    public function create(
        User $actor,
        Business $business,
        Website $website,
        string $source,
        string $name,
        array $scopes = ['events:write'],
        ?Request $request = null,
    ): array {
        if ($website->business_id !== $business->id) {
            throw ValidationException::withMessages([
                'website_id' => ['Website does not belong to the business.'],
            ]);
        }

        $normalizedSource = Str::lower(Str::slug($source, '_'));
        if ($normalizedSource === '') {
            throw ValidationException::withMessages([
                'source' => ['Source must be a non-empty stable identifier.'],
            ]);
        }

        $exists = IntegrationCredential::query()
            ->where('business_id', $business->id)
            ->where('source', $normalizedSource)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'source' => ['An integration credential already exists for this source.'],
            ]);
        }

        $plainToken = 'aact_'.Str::random(48);
        $hmacSecret = Str::random(64);

        $credential = IntegrationCredential::query()->create([
            'business_id' => $business->id,
            'website_id' => $website->id,
            'source' => $normalizedSource,
            'name' => $name,
            'token_hash' => hash('sha256', $plainToken),
            'hmac_secret_encrypted' => $hmacSecret,
            'scopes' => $scopes,
            'created_by_user_id' => $actor->id,
        ]);

        $this->audit->log(
            action: 'integration_credential.created',
            actor: $actor,
            businessId: $business->id,
            entity: new AuditEntity(IntegrationCredential::class, $credential->id),
            context: ['source' => $normalizedSource, 'website_id' => $website->id],
            request: $request,
        );

        return [
            'credential' => $credential->load(['business', 'website']),
            'plain_token' => $plainToken,
            'hmac_secret' => $hmacSecret,
        ];
    }

    public function revoke(IntegrationCredential $credential, User $actor, Request $request): void
    {
        $credential->forceFill(['revoked_at' => now()])->save();

        $this->audit->log(
            action: 'integration_credential.revoked',
            actor: $actor,
            businessId: $credential->business_id,
            entity: new AuditEntity(IntegrationCredential::class, $credential->id),
            request: $request,
        );
    }

    /**
     * @return array{credential: IntegrationCredential, plain_token: string, hmac_secret: string}
     */
    public function rotate(IntegrationCredential $credential, User $actor, Request $request): array
    {
        $plainToken = 'aact_'.Str::random(48);
        $hmacSecret = Str::random(64);

        $credential->forceFill([
            'token_hash' => hash('sha256', $plainToken),
            'hmac_secret_encrypted' => $hmacSecret,
            'revoked_at' => null,
            'last_used_at' => null,
        ])->save();

        $this->audit->log(
            action: 'integration_credential.rotated',
            actor: $actor,
            businessId: $credential->business_id,
            entity: new AuditEntity(IntegrationCredential::class, $credential->id),
            context: ['source' => $credential->source],
            request: $request,
        );

        return [
            'credential' => $credential->fresh(['business', 'website']),
            'plain_token' => $plainToken,
            'hmac_secret' => $hmacSecret,
        ];
    }

    public function findByPlainToken(string $plainToken): ?IntegrationCredential
    {
        $hash = hash('sha256', $plainToken);

        return IntegrationCredential::query()
            ->where('token_hash', $hash)
            ->with(['business', 'website'])
            ->first();
    }
}
