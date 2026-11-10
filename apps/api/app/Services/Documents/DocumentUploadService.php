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
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Mime\MimeTypes;

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
        $this->assertAllowed($file);

        $extension = strtolower($file->getClientOriginalExtension());
        $randomName = Str::uuid()->toString().'.'.$extension;
        $path = $membership->business_id.'/'.$user->id.'/'.$randomName;

        Storage::disk('private_documents')->putFileAs(
            dirname($path),
            $file,
            basename($path)
        );

        $absolute = Storage::disk('private_documents')->path($path);
        $scan = $this->scanner->scan($absolute);

        $document = PrivateDocument::query()->create([
            'user_id' => $user->id,
            'business_id' => $membership->business_id,
            'business_membership_id' => $membership->id,
            'purpose' => $purpose,
            'disk' => 'private_documents',
            'path' => $path,
            'original_filename' => $file->getClientOriginalName(),
            'mime' => $file->getMimeType() ?: 'application/octet-stream',
            'size_bytes' => $file->getSize() ?: 0,
            'scan_status' => $scan['status'],
            'scanned_at' => now(),
            'scan_engine' => $scan['engine'],
        ]);

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

        $this->audit->log(
            action: 'document.downloaded',
            actor: $actor,
            businessId: $document->business_id,
            entity: new AuditEntity(PrivateDocument::class, $document->id),
            request: $request,
        );

        return Storage::disk($document->disk)->download(
            $document->path,
            $document->original_filename,
            [
                'Content-Type' => $document->mime,
                'X-Content-Type-Options' => 'nosniff',
                'Content-Disposition' => 'attachment; filename="'.$document->original_filename.'"',
            ]
        );
    }

    private function assertAllowed(UploadedFile $file): void
    {
        $max = (int) config('aact.documents.max_bytes');
        if (($file->getSize() ?: 0) > $max) {
            throw ValidationException::withMessages([
                'file' => ['File exceeds the maximum allowed size.'],
            ]);
        }

        $extension = strtolower($file->getClientOriginalExtension());
        $allowedExtensions = config('aact.documents.allowed_extensions');
        if (! in_array($extension, $allowedExtensions, true)) {
            throw ValidationException::withMessages([
                'file' => ['File extension is not allowed.'],
            ]);
        }

        $detected = $file->getMimeType();
        $allowedMimes = config('aact.documents.allowed_mimes');
        if (! in_array($detected, $allowedMimes, true)) {
            throw ValidationException::withMessages([
                'file' => ['Detected file content type is not allowed.'],
            ]);
        }

        // Reject ambiguous HTML/SVG even if extension was renamed.
        $guessed = MimeTypes::getDefault()->guessMimeType($file->getRealPath() ?: '') ?? $detected;
        if (in_array($guessed, ['image/svg+xml', 'text/html', 'application/xhtml+xml'], true)) {
            throw ValidationException::withMessages([
                'file' => ['File content type is not allowed.'],
            ]);
        }
    }
}
