<?php

use App\Http\Middleware\AssignCorrelationId;
use App\Http\Middleware\EnsureAdminAccess;
use App\Http\Middleware\EnsureFullyAuthenticated;
use App\Http\Middleware\EnsureStepUp;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Local Compose sits behind Nginx. Production operators should narrow this
        // (see config/aact.php `trusted_proxies` + docs/hardening.md).
        $middleware->trustProxies(at: '*');
        $middleware->statefulApi();
        $middleware->append(AssignCorrelationId::class);
        $middleware->validateCsrfTokens(except: [
            'api/v1/integration/*',
        ]);
        $middleware->alias([
            'fully.authenticated' => EnsureFullyAuthenticated::class,
            'admin.access' => EnsureAdminAccess::class,
            'step.up' => EnsureStepUp::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
