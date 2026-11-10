<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthEndpointTest extends TestCase
{
    public function test_health_endpoint_returns_ok_payload(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('service', 'aact-api')
            ->assertJsonStructure([
                'status',
                'service',
                'checks' => ['app', 'database', 'redis'],
                'timestamp',
            ]);
    }
}
