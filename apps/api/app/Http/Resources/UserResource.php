<?php

namespace App\Http\Resources;

use App\Models\BusinessMembership;
use App\Models\User;
use App\Support\AuthSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'platform_role' => $this->platform_role?->value,
            'is_admin' => $this->isAdminUser(),
            'mfa' => [
                'totp_enabled' => $this->hasConfirmedTotp(),
                'email_otp_enabled' => $this->hasEmailOtpEnabled(),
                'recovery_codes_remaining' => $this->recoveryCodes()->whereNull('consumed_at')->count(),
            ],
            'session' => [
                'fully_authenticated' => AuthSession::isFullyAuthenticated(),
                'mfa_setup_only' => AuthSession::isMfaSetupOnly(),
                'step_up_active' => AuthSession::hasValidStepUp(),
            ],
            'memberships' => $this->whenLoaded('memberships', function () {
                return $this->memberships
                    ->map(static function (BusinessMembership $membership): array {
                        return [
                            'business_id' => $membership->business_id,
                            'role' => $membership->role->value,
                            'status' => $membership->status,
                        ];
                    })
                    ->values()
                    ->all();
            }),
        ];
    }
}
