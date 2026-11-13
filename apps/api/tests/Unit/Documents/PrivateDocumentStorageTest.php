<?php

namespace Tests\Unit\Documents;

use App\Services\Documents\PrivateDocumentStorage;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

class PrivateDocumentStorageTest extends TestCase
{
    public function test_stores_encrypted_and_decrypts_on_read(): void
    {
        Storage::fake(PrivateDocumentStorage::DISK);

        $path = '1/2/proof.pdf';
        $plain = '%PDF-1.4 bank statement';

        PrivateDocumentStorage::putEncrypted($path, $plain);

        $raw = Storage::disk(PrivateDocumentStorage::DISK)->get($path);
        $this->assertIsString($raw);
        $this->assertStringStartsWith(PrivateDocumentStorage::PAYLOAD_PREFIX, $raw);
        $this->assertNotSame($plain, $raw);
        $this->assertSame($plain, PrivateDocumentStorage::getDecrypted($path));
        $this->assertTrue(PrivateDocumentStorage::isReadable($path));
    }

    public function test_requires_encryption_key(): void
    {
        Storage::fake(PrivateDocumentStorage::DISK);
        config(['aact.documents.encryption_key' => null]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('AACT_PRIVATE_DOCUMENT_ENCRYPTION_KEY');

        PrivateDocumentStorage::putEncrypted('x.pdf', 'data');
    }

    public function test_deletes_encrypted_documents(): void
    {
        Storage::fake(PrivateDocumentStorage::DISK);

        $path = '1/2/bye.pdf';
        PrivateDocumentStorage::putEncrypted($path, 'bye');
        $this->assertTrue(PrivateDocumentStorage::exists($path));

        PrivateDocumentStorage::delete($path);
        $this->assertFalse(PrivateDocumentStorage::exists($path));
    }

    public function test_reads_legacy_plaintext_objects(): void
    {
        Storage::fake(PrivateDocumentStorage::DISK);

        $path = 'legacy/doc.pdf';
        $plain = '%PDF-1.4 legacy';
        Storage::disk(PrivateDocumentStorage::DISK)->put($path, $plain);

        $this->assertSame($plain, PrivateDocumentStorage::getDecrypted($path));
    }
}
