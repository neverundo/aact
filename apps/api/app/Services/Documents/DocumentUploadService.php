<?php

namespace App\Services\Documents;

use App\Enums\DocumentScanStatus;
use App\Models\BusinessMembership;
use App\Models\PrivateDocument;
use App\Models\User;
use App\Services\Audit\AuditEntity;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class DocumentUploadService
{
    public function __construct(
        private readonly FileScanner $scanner,
        private readonly AuditLogger $audit,
    ) {}

    public function store(
        User $user,
        BusinessMembership $membership,
        UploadedFile $file,
        string $purpose,
        ?Request $request = null,
    ): PrivateDocument {
        if (! $file->isValid()) {
            throw ValidationException::withMessages([
                'file' => ['The uploaded file is not valid.'],
            ]);
        }

        $max = (int) config('aact.documents.max_bytes');
        if (($file->getSize() ?: 0) > $max) {
            throw ValidationException::withMessages([
                'file' => ['File exceeds the maximum allowed size.'],
            ]);
        }

        $binary = $file->get();
        if (! is_string($binary) || $binary === '') {
            throw ValidationException::withMessages([
                'file' => ['The uploaded file is empty or unreadable.'],
            ]);
        }

        $mime = DocumentContentInspector::detectAllowedMime($binary);
        if ($mime === null) {
            throw ValidationException::withMessages([
                'file' => ['Detected file content type is not allowed.'],
            ]);
        }

        $extension = DocumentContentInspector::extensionForMime($mime);
        $originalName = $this->sanitizeOriginalName((string) $file->getClientOriginalName(), $extension);
        $randomName = Str::uuid()->toString().'.'.$extension;
        $path = $membership->business_id.'/'.$user->id.'/'.$randomName;

        $scan = $this->scanPlaintext($binary);

        try {
            PrivateDocumentStorage::putEncrypted($path, $binary);
        } catch (Throwable $e) {
            report($e);

            throw ValidationException::withMessages([
                'file' => ['Failed to store the uploaded document.'],
            ]);
        }

        try {
            $document = PrivateDocument::query()->create([
                'user_id' => $user->id,
                'business_id' => $membership->business_id,
                'business_membership_id' => $membership->id,
                'purpose' => $purpose,
                'disk' => PrivateDocumentStorage::DISK,
                'path' => $path,
                'original_filename' => $originalName,
                'mime' => $mime,
                'size_bytes' => strlen($binary),
                'scan_status' => $scan['status'],
                'scanned_at' => now(),
                'scan_engine' => $scan['engine'],
            ]);
        } catch (Throwable $e) {
            PrivateDocumentStorage::delete($path);

            throw $e;
        }

        $this->audit->log(
            action: 'document.uploaded',
            actor: $user,
            businessId: $membership->business_id,
            entity: new AuditEntity(PrivateDocument::class, $document->id),
            context: [
                'purpose' => $purpose,
                'scan_status' => $scan['status']->value,
                'mime' => $document->mime,
                'size_bytes' => $document->size_bytes,
            ],
            request: $request,
        );

        return $document;
    }

    public function downloadAuthorized(PrivateDocument $document, User $actor, Request $request): StreamedResponse
    {
        if ($document->scan_status !== DocumentScanStatus::Clean) {
            throw ValidationException::withMessages([
                'document' => ['Document is not available for download while scan is pending or failed.'],
            ]);
        }

        $plain = PrivateDocumentStorage::getDecrypted($document->path);

        $this->audit->log(
            action: 'document.downloaded',
            actor: $actor,
            businessId: $document->business_id,
            entity: new AuditEntity(PrivateDocument::class, $document->id),
            request: $request,
        );

        $filename = $document->original_filename;

        // Opaque attachment — never inline-preview untrusted uploads in the browser.
        return response()->streamDownload(
            function () use ($plain): void {
                echo $plain;
            },
            $filename,
            [
                'Content-Type' => 'application/octet-stream',
                'X-Content-Type-Options' => 'nosniff',
                'Content-Security-Policy' => "default-src 'none'; sandbox",
                'X-Frame-Options' => 'DENY',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            ]
        );
    }

    /**
     * @return array{status: DocumentScanStatus, engine: string}
     */
    private function scanPlaintext(string $binary): array
    {
        $temp = tempnam(sys_get_temp_dir(), 'aactdoc_');
        if ($temp === false) {
            return [
                'status' => DocumentScanStatus::Unavailable,
                'engine' => 'unavailable',
            ];
        }

        try {
            if (file_put_contents($temp, $binary) === false) {
                return [
                    'status' => DocumentScanStatus::Unavailable,
                    'engine' => 'unavailable',
                ];
            }

            return $this->scanner->scan($temp);
        } finally {
            @unlink($temp);
        }
    }

    private function sanitizeOriginalName(string $clientName, string $extension): string
    {
        $base = pathinfo($clientName, PATHINFO_FILENAME);
        $base = preg_replace('/[^A-Za-z0-9._-]+/', '_', $base) ?? '';
        $base = trim($base, '._-');
        if ($base === '') {
            $base = 'document';
        }

        return Str::limit($base, 180, '').'.'.$extension;
    }
}
