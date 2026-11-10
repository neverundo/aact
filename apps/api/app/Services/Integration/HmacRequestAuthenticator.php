<?php

namespace App\Services\Integration;

use App\Models\IntegrationCredential;
use App\Models\IntegrationNonce;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class HmacRequestAuthenticator
{
    public function __construct(private readonly IntegrationCredentialService $credentials) {}

    public function authenticate(Request $request, string $requiredScope = 'events:write'): IntegrationCredential
    {
        $bearer = $request->bearerToken();
        if ($bearer === null || $bearer === '') {
            throw ValidationException::withMessages([
                'authorization' => ['Bearer token is required.'],
            ]);
        }

        $credential = $this->credentials->findByPlainToken($bearer);
        if ($credential === null || ! $credential->isUsable()) {
            throw ValidationException::withMessages([
                'authorization' => ['Invalid or revoked integration credential.'],
            ]);
        }

        if (! $credential->hasScope($requiredScope)) {
            throw ValidationException::withMessages([
                'authorization' => ['Credential lacks required scope.'],
            ]);
        }

        $timestamp = $request->header('X-AACT-Timestamp');
        $nonce = $request->header('X-AACT-Nonce');
        $signature = $request->header('X-AACT-Signature');

        if (! is_string($timestamp) || ! ctype_digit($timestamp)) {
            throw ValidationException::withMessages([
                'timestamp' => ['X-AACT-Timestamp must be a unix epoch second.'],
            ]);
        }

        if (! is_string($nonce) || strlen($nonce) < 16 || strlen($nonce) > 128) {
            throw ValidationException::withMessages([
                'nonce' => ['X-AACT-Nonce is required (16–128 chars).'],
            ]);
        }

        if (! is_string($signature) || $signature === '') {
            throw ValidationException::withMessages([
                'signature' => ['X-AACT-Signature is required.'],
            ]);
        }

        $skew = (int) config('aact.integration.timestamp_skew_seconds', 300);
        $ts = (int) $timestamp;
        if (abs(now()->timestamp - $ts) > $skew) {
            throw ValidationException::withMessages([
                'timestamp' => ['Request timestamp is outside the allowed skew window.'],
            ]);
        }

        $rawBody = $request->getContent();
        $payload = $timestamp.'.'.$nonce.'.'.$rawBody;
        $expected = hash_hmac('sha256', $payload, $credential->hmac_secret_encrypted);

        if (! hash_equals($expected, strtolower($signature)) && ! hash_equals($expected, $signature)) {
            throw ValidationException::withMessages([
                'signature' => ['HMAC signature verification failed.'],
            ]);
        }

        try {
            IntegrationNonce::query()->create([
                'integration_credential_id' => $credential->id,
                'nonce' => $nonce,
                'used_at' => now(),
            ]);
        } catch (QueryException) {
            throw ValidationException::withMessages([
                'nonce' => ['Nonce has already been used.'],
            ]);
        }

        $credential->forceFill(['last_used_at' => now()])->save();

        return $credential;
    }
}
