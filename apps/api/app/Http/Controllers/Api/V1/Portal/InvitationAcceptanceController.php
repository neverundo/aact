<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvitationResource;
use App\Http\Resources\MembershipResource;
use App\Models\User;
use App\Services\Onboarding\InvitationService;
use App\Support\AuthSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class InvitationAcceptanceController extends Controller
{
    public function __construct(private readonly InvitationService $invitations) {}

    public function show(Request $request, string $uuid): InvitationResource
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
        ]);

        // GET must never consume the invitation.
        return new InvitationResource(
            $this->invitations->preview($uuid, $validated['token'])
        );
    }

    public function register(Request $request, string $uuid): JsonResponse
    {
        $min = (int) config('aact.password.min_length');
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'confirmed', PasswordRule::min($min)],
        ]);

        $preview = $this->invitations->preview($uuid, $validated['token']);

        if (User::query()->where('email', $preview->email)->exists()) {
            throw ValidationException::withMessages([
                'email' => ['An account already exists for this email. Sign in and accept the invitation.'],
            ]);
        }

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => $preview->email,
            'password' => Hash::make($validated['password']),
            'email_verified_at' => now(), // invitation proves mailbox control for MVP onboarding
        ]);

        $membership = $this->invitations->accept($uuid, $validated['token'], $user, $request);

        auth('web')->login($user);
        $request->session()->regenerate();
        AuthSession::markFullyAuthenticated();

        return response()->json([
            'status' => 'registered_and_accepted',
            'membership' => (new MembershipResource($membership))->resolve(),
        ], 201);
    }

    public function accept(Request $request, string $uuid): MembershipResource
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
        ]);

        $membership = $this->invitations->accept(
            $uuid,
            $validated['token'],
            $request->user(),
            $request,
        );

        return new MembershipResource($membership);
    }
}
