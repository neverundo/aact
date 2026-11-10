<?php

namespace App\Http\Middleware;

use App\Support\AuthSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureFullyAuthenticated
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! AuthSession::isFullyAuthenticated()) {
            return response()->json([
                'message' => 'Full authentication required.',
                'code' => 'mfa_setup_only',
            ], 403);
        }

        return $next($request);
    }
}
