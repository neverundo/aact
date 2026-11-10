<?php

namespace Tests\Unit\Documents;

use App\Enums\DocumentScanStatus;
use App\Services\Documents\ClamAvFileScanner;
use App\Services\Documents\FakeFileScanner;
use App\Services\Documents\FileScanner;
use App\Services\Documents\UnavailableFileScanner;
use ReflectionMethod;
use Tests\TestCase;

class FileScannerTest extends TestCase
{
    public function test_fake_and_unavailable_scanners_return_expected_payloads(): void
    {
        $fake = new FakeFileScanner(DocumentScanStatus::Infected);
        $this->assertSame(DocumentScanStatus::Infected, $fake->scan('/tmp/x')['status']);
        $this->assertSame('fake', $fake->scan('/tmp/x')['engine']);

        $unavailable = new UnavailableFileScanner;
        $this->assertSame(DocumentScanStatus::Unavailable, $unavailable->scan('/tmp/x')['status']);
        $this->assertSame('unavailable', $unavailable->scan('/tmp/x')['engine']);
    }

    public function test_clamav_returns_unavailable_when_daemon_unreachable(): void
    {
        $scanner = new ClamAvFileScanner('127.0.0.1', 1);
        $result = $scanner->scan(__FILE__);

        $this->assertSame(DocumentScanStatus::Unavailable, $result['status']);
        $this->assertSame('clamav', $result['engine']);
    }

    public function test_clamav_response_parsing_prefers_found_over_ok_substring(): void
    {
        $this->assertSame(DocumentScanStatus::Clean, $this->parseClamAvResponse("stream: OK\0"));
        $this->assertSame(DocumentScanStatus::Infected, $this->parseClamAvResponse('stream: Eicar-Test-Signature FOUND'));
        $this->assertSame(
            DocumentScanStatus::Infected,
            $this->parseClamAvResponse('stream: Heuristics.Phishing.Email.Spoofed-SSLCertificate.OK FOUND'),
        );
        $this->assertSame(DocumentScanStatus::Unavailable, $this->parseClamAvResponse('stream: ERROR'));
        $this->assertSame(DocumentScanStatus::Unavailable, $this->parseClamAvResponse('UNEXPECTED OK TOKEN'));
    }

    public function test_container_binds_fake_scanner_in_testing(): void
    {
        $scanner = $this->app->make(FileScanner::class);
        $this->assertInstanceOf(FakeFileScanner::class, $scanner);
    }

    private function parseClamAvResponse(string $response): DocumentScanStatus
    {
        $scanner = new ClamAvFileScanner('127.0.0.1', 3310);
        $method = new ReflectionMethod(ClamAvFileScanner::class, 'statusFromResponse');

        return $method->invoke($scanner, $response);
    }
}
