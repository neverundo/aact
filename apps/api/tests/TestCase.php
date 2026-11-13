<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * @return array<string, string>
     */
    protected function resolveTestingEnv(): array
    {
        return [
            'APP_ENV' => 'testing',
            'SESSION_DRIVER' => 'array',
            'CACHE_STORE' => 'array',
            'QUEUE_CONNECTION' => 'sync',
            'MAIL_MAILER' => 'array',
            'DB_CONNECTION' => 'sqlite',
            'DB_DATABASE' => ':memory:',
            'AACT_FILE_SCANNER' => 'fake',
            'AACT_ADMIN_TOTP_REQUIRED' => 'false',
            'PRIVATE_DOCUMENTS_DRIVER' => 'local',
            'AACT_PRIVATE_DOCUMENT_ENCRYPTION_KEY' => 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        ];
    }

    protected function setUp(): void
    {
        // PHPUnit force=true updates putenv/$_ENV but Compose also populates $_SERVER;
        // Laravel's env() reads $_SERVER first, so override before the app boots.
        foreach ($this->resolveTestingEnv() as $key => $value) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }

        parent::setUp();

        config([
            'sanctum.stateful' => ['localhost', '127.0.0.1'],
            'session.domain' => 'localhost',
        ]);
    }

    /**
     * Mark the next request as a first-party SPA call so Sanctum starts a session.
     */
    protected function asSpa(): static
    {
        return $this->withHeaders([
            'Origin' => 'http://localhost',
            'Referer' => 'http://localhost/',
        ]);
    }
}
