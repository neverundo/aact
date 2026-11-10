<?php

namespace App\Providers;

use App\Models\Business;
use App\Models\Website;
use App\Policies\BusinessPolicy;
use App\Policies\WebsitePolicy;
use App\Services\Documents\ClamAvFileScanner;
use App\Services\Documents\FakeFileScanner;
use App\Services\Documents\FileScanner;
use App\Services\Documents\UnavailableFileScanner;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use PragmaRX\Google2FA\Google2FA;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(Google2FA::class, fn () => new Google2FA);

        $this->app->bind(FileScanner::class, function () {
            $driver = (string) config('aact.documents.scanner', 'auto');

            if ($driver === 'fake' || $this->app->environment('testing')) {
                return new FakeFileScanner;
            }

            if ($driver === 'unavailable') {
                return new UnavailableFileScanner;
            }

            if ($driver === 'clamav' || $driver === 'auto') {
                return new ClamAvFileScanner(
                    (string) config('aact.documents.clamav_host'),
                    (int) config('aact.documents.clamav_port'),
                );
            }

            return new UnavailableFileScanner;
        });
    }

    public function boot(): void
    {
        Gate::policy(Business::class, BusinessPolicy::class);
        Gate::policy(Website::class, WebsitePolicy::class);

        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by(strtolower((string) $request->input('email')).'|'.$request->ip());
        });
    }
}
