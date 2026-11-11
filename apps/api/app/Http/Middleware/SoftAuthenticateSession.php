<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sanctum's AuthenticateSession logs out, flushes the session, and throws when the
 * stored password hash no longer matches (e.g. after DemoSeeder / admin rotation).
 *
 * That breaks auth entrypoints: login/MFA need a usable session+CSRF, and logout is
 * behind auth:sanctum so a flushed session becomes a confusing 401.
 *
 * For those routes, skip the password-hash gate and let the controller establish or
 * tear down the session normally.
 */
class SoftAuthenticateSession extends AuthenticateSession
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($this->shouldSkipPasswordHashCheck($request)) {
            return $next($request);
        }

        return parent::handle($request, $next);
    }

    private function shouldSkipPasswordHashCheck(Request $request): bool
    {
        return $request->is(
            'api/v1/auth/login',
            'api/v1/auth/logout',
            'api/v1/auth/mfa/verify',
            'api/v1/auth/password/forgot',
            'api/v1/auth/password/reset',
        );
    }
}
