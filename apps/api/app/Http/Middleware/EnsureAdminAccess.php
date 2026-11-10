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

        if ($user === null || ! $user->isAdminUser()) {
            return response()->json([
                'message' => 'Administrator access required.',
                'code' => 'forbidden',
            ], 403);
        }

        if (! AuthSession::isFullyAuthenticated()) {
            return response()->json([
                'message' => 'Complete authenticator setup before accessing administration.',
                'code' => 'mfa_setup_required',
            ], 403);
        }

        if ($user->requiresTotpForAdminAccess() && ! $user->hasConfirmedTotp()) {
            return response()->json([
                'message' => 'TOTP is required for administrators.',
                'code' => 'admin_totp_required',
            ], 403);
        }

        return $next($request);
    }
}
