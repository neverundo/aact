<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sanctum's AuthenticateSession flushes the session and throws when the stored
 * password hash no longer matches (e.g. after DemoSeeder re-hashes passwords).
 * That turns a subsequent login attempt into a confusing "Unauthenticated."
 * For auth entrypoints, clear the stale session and let the request continue.
 */
class SoftAuthenticateSession extends AuthenticateSession
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            return parent::handle($request, $next);
        } catch (AuthenticationException $exception) {
            if ($this->shouldSoftContinue($request)) {
                return $next($request);
            }

            throw $exception;
        }
    }

    private function shouldSoftContinue(Request $request): bool
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
