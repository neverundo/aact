<?php

namespace Tests\Financial;

use Tests\TestCase;

abstract class FinancialTestCase extends TestCase
{
    /**
     * @return array<string, string>
     */
    protected function resolveTestingEnv(): array
    {
        $env = parent::resolveTestingEnv();

        $env['DB_CONNECTION'] = 'mysql';
        $env['DB_HOST'] = getenv('AACT_TEST_DB_HOST') ?: 'mariadb';
        $env['DB_PORT'] = getenv('AACT_TEST_DB_PORT') ?: '3306';
        $env['DB_DATABASE'] = getenv('AACT_TEST_DB_DATABASE') ?: 'aact_test';
        $env['DB_USERNAME'] = getenv('AACT_TEST_DB_USERNAME') ?: 'aact';
        $env['DB_PASSWORD'] = getenv('AACT_TEST_DB_PASSWORD') ?: 'aact_secret';

        return $env;
    }

    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'mysql') {
            $this->markTestSkipped('MariaDB financial suite requires mysql connection.');
        }
    }
}
