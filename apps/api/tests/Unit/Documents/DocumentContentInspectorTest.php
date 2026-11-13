<?php

namespace Tests\Unit\Documents;

use App\Services\Documents\DocumentContentInspector;
use Tests\TestCase;

class DocumentContentInspectorTest extends TestCase
{
    public function test_detects_pdf_jpeg_and_png_from_magic_bytes(): void
    {
        $this->assertSame(
            'application/pdf',
            DocumentContentInspector::detectAllowedMime('%PDF-1.4 bank statement')
        );
        $this->assertSame(
            'image/jpeg',
            DocumentContentInspector::detectAllowedMime("\xFF\xD8\xFF\xE0jpeg-bytes")
        );
        $this->assertSame(
            'image/png',
            DocumentContentInspector::detectAllowedMime("\x89PNG\r\n\x1a\nrest")
        );
    }

    public function test_rejects_spoofed_or_unsupported_payloads(): void
    {
        $this->assertNull(DocumentContentInspector::detectAllowedMime('not a proof'));
        $this->assertNull(DocumentContentInspector::detectAllowedMime('GIF89a fake'));
        $this->assertNull(DocumentContentInspector::detectAllowedMime(''));
        $this->assertNull(DocumentContentInspector::detectAllowedMime('<!DOCTYPE html><html></html>'));
    }

    public function test_maps_detected_mime_to_safe_storage_extensions(): void
    {
        $this->assertSame('pdf', DocumentContentInspector::extensionForMime('application/pdf'));
        $this->assertSame('jpg', DocumentContentInspector::extensionForMime('image/jpeg'));
        $this->assertSame('png', DocumentContentInspector::extensionForMime('image/png'));
    }
}
