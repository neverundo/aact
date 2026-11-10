<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Throwable;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'app' => true,
            'database' => $this->databaseOk(),
            'redis' => $this->redisOk(),
        ];

        $healthy = ! in_array(false, $checks, true);

        return response()->json([
            'status' => $healthy ? 'ok' : 'degraded',
            'service' => 'aact-api',
            'checks' => $checks,
            'timestamp' => now()->utc()->toIso8601String(),
        ], $healthy ? 200 : 503);
    }

    private function databaseOk(): bool
    {
        try {
            DB::select('select 1');

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    private function redisOk(): bool
    {
        $usesRedis = in_array('redis', [
            (string) config('cache.default'),
            (string) config('queue.default'),
            (string) config('session.driver'),
        ], true);

        if (! $usesRedis) {
            return true;
        }

        try {
            Redis::connection()->ping();

            return true;
        } catch (Throwable) {
            return false;
        }
    }
}
