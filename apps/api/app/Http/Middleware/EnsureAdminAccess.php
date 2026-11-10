<?php

namespace App\Http\Middleware;

use App\Support\AuthSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminAccess
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $denial = null;

        if ($user === null || ! $user->isAdminUser()) {
            $denial = [
                'message' => 'Administrator access required.',
                'code' => 'forbidden',
            ];
        } elseif (! AuthSession::isFullyAuthenticated()) {
            $denial = [
                'message' => 'Complete authenticator setup before accessing administration.',
                'code' => 'mfa_setup_required',
            ];
        } elseif ($user->requiresTotpForAdminAccess() && ! $user->hasConfirmedTotp()) {
            $denial = [
                'message' => 'TOTP is required for administrators.',
                'code' => 'admin_totp_required',
            ];
        }

        if ($denial !== null) {
            return response()->json($denial, 403);
        }

        return $next($request);
    }
}
