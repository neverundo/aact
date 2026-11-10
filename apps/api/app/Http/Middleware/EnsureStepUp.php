<?php

namespace App\Http\Middleware;

use App\Support\AuthSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStepUp
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! AuthSession::hasValidStepUp()) {
            return response()->json([
                'message' => 'Recent re-authentication is required.',
                'code' => 'step_up_required',
            ], 403);
        }

        return $next($request);
    }
}
