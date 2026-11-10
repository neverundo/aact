<?php

namespace App\Services\Auth;

use App\Models\User;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

class TotpService
{
    public function __construct(private readonly Google2FA $google2fa) {}

    /**
     * @return array{secret: string, otpauth_url: string, qr_svg: string}
     */
    public function beginSetup(User $user): array
    {
        $secret = $this->google2fa->generateSecretKey(32);

        $user->forceFill([
            'totp_secret' => $secret,
            'totp_confirmed_at' => null,
            'totp_last_timestep' => null,
        ])->save();

        $otpauth = $this->google2fa->getQRCodeUrl(
            (string) config('app.name', 'AACT'),
            $user->email,
            $secret
        );

        return [
            'secret' => $secret,
            'otpauth_url' => $otpauth,
            'qr_svg' => $this->renderQrSvg($otpauth),
        ];
    }

    public function confirmSetup(User $user, string $code): void
    {
        if (blank($user->totp_secret) || $user->hasConfirmedTotp()) {
            throw ValidationException::withMessages([
                'code' => ['TOTP setup is not pending confirmation.'],
            ]);
        }

        $window = (int) config('aact.mfa.totp_window');
        $valid = $this->google2fa->verifyKey($user->totp_secret, $code, $window);

        if (! $valid) {
            throw ValidationException::withMessages([
                'code' => ['Invalid authentication code.'],
            ]);
        }

        $user->forceFill([
            'totp_confirmed_at' => now(),
            'totp_last_timestep' => $this->google2fa->getTimestamp(),
        ])->save();
    }

    public function verifyForUser(User $user, string $code): void
    {
        if (! $user->hasConfirmedTotp() || blank($user->totp_secret)) {
            throw ValidationException::withMessages([
                'code' => ['TOTP is not enabled for this account.'],
            ]);
        }

        DB::transaction(function () use ($user, $code): void {
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $window = (int) config('aact.mfa.totp_window');

            $timestep = $this->google2fa->verifyKeyNewer(
                $locked->totp_secret,
                $code,
                $locked->totp_last_timestep,
                $window
            );

            if ($timestep === false) {
                throw ValidationException::withMessages([
                    'code' => ['Invalid authentication code.'],
                ]);
            }

            // google2fa returns true when old timestamp is null; store the current OTP counter.
            if ($timestep === true) {
                $timestep = $this->google2fa->getTimestamp();
            }

            $locked->forceFill(['totp_last_timestep' => $timestep])->save();
        });
    }

    public function disable(User $user): void
    {
        $user->forceFill([
            'totp_secret' => null,
            'totp_confirmed_at' => null,
            'totp_last_timestep' => null,
        ])->save();
    }

    private function renderQrSvg(string $otpauthUrl): string
    {
        $renderer = new ImageRenderer(
            new RendererStyle(240),
            new SvgImageBackEnd
        );

        return (new Writer($renderer))->writeString($otpauthUrl);
    }
}
