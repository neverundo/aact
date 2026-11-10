<?php

namespace Tests\Feature\Health;

use Tests\TestCase;

class CorrelationIdTest extends TestCase
{
    public function test_health_echoes_correlation_id_header(): void
    {
        $response = $this->getJson('/api/v1/health', [
            'X-Correlation-Id' => 'demo-correlation-123',
        ]);

        $response->assertOk()
            ->assertHeader('X-Correlation-Id', 'demo-correlation-123');
    }

    public function test_health_assigns_correlation_id_when_missing(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertOk();
        $this->assertNotEmpty($response->headers->get('X-Correlation-Id'));
    }
}
