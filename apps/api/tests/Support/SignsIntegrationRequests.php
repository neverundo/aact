<?php

namespace Tests\Support;

use App\Models\IntegrationCredential;
use Illuminate\Testing\TestResponse;

trait SignsIntegrationRequests
{
    /**
     * @param  array<string, mixed>  $body
     */
    protected function postSignedEvent(
        IntegrationCredential $credential,
        string $plainToken,
        string $hmacSecret,
        array $body,
        ?string $nonce = null,
    ): TestResponse {
        $raw = json_encode($body, JSON_THROW_ON_ERROR);
        $timestamp = (string) now()->timestamp;
        $nonce ??= bin2hex(random_bytes(16));
        $signature = hash_hmac('sha256', $timestamp.'.'.$nonce.'.'.$raw, $hmacSecret);

        return $this->withHeaders([
            'Authorization' => 'Bearer '.$plainToken,
            'X-AACT-Timestamp' => $timestamp,
            'X-AACT-Nonce' => $nonce,
            'X-AACT-Signature' => $signature,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ])->call(
            'POST',
            '/api/v1/integration/events',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_ACCEPT' => 'application/json',
                'HTTP_AUTHORIZATION' => 'Bearer '.$plainToken,
                'HTTP_X_AACT_TIMESTAMP' => $timestamp,
                'HTTP_X_AACT_NONCE' => $nonce,
                'HTTP_X_AACT_SIGNATURE' => $signature,
            ],
            $raw,
        );
    }
}
