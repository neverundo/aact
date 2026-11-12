<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Support\AuthSession;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class PasswordController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $min = (int) config('aact.password.min_length');

        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', PasswordRule::min($min)],
        ]);

        $user = $request->user();
        $user->forceFill([
            'password' => $validated['password'],
            'password_changed_at' => now(),
            'remember_token' => Str::random(60),
        ])->save();

        DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();

        $request->session()->regenerate();

        // Align with login: admins without confirmed TOTP stay in MFA setup-only.
        if ($user->isAdminUser() && ! $user->hasConfirmedTotp()) {
            AuthSession::markMfaSetupOnly();
        } else {
            AuthSession::markFullyAuthenticated();
        }

        return response()->json(['status' => 'password_updated']);
    }

    public function forgot(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        // Always return the same message to avoid account enumeration.
        Password::sendResetLink($request->only('email'));

        return response()->json([
            'status' => 'reset_link_sent',
            'message' => 'If the account exists, a reset link has been sent.',
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $min = (int) config('aact.password.min_length');

        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min($min)],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'password_changed_at' => now(),
                    'remember_token' => Str::random(60),
                ])->save();

                DB::table('sessions')->where('user_id', $user->id)->delete();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => ['Unable to reset password with the provided token.'],
            ]);
        }

        return response()->json(['status' => 'password_reset']);
    }
}
