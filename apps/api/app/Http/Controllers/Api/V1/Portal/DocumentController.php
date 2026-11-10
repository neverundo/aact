<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Resources\PrivateDocumentResource;
use App\Models\BusinessMembership;
use App\Models\PrivateDocument;
use App\Services\Documents\DocumentUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function __construct(private readonly DocumentUploadService $uploads) {}

    public function index(Request $request, BusinessMembership $membership): AnonymousResourceCollection
    {
        $this->assertOwner($request, $membership);

        $documents = PrivateDocument::query()
            ->where('business_membership_id', $membership->id)
            ->latest('id')
            ->get();

        return PrivateDocumentResource::collection($documents);
    }

    public function store(Request $request, BusinessMembership $membership): JsonResponse
    {
        $this->assertOwner($request, $membership);

        $validated = $request->validate([
            'purpose' => ['required', 'string', 'max:64'],
            // 5 MiB — keep aligned with config('aact.documents.max_bytes') default.
            'file' => ['required', 'file', 'max:5120'],
        ]);

        $document = $this->uploads->store(
            $request->user(),
            $membership,
            $request->file('file'),
            $validated['purpose'],
            $request,
        );

        return (new PrivateDocumentResource($document))
            ->response()
            ->setStatusCode(201);
    }

    public function download(Request $request, string $uuid): StreamedResponse
    {
        $document = PrivateDocument::query()->where('uuid', $uuid)->firstOrFail();

        $user = $request->user();
        $allowed = $document->user_id === $user->id
            || $user->isPlatformAdmin()
            || $user->isBusinessAdmin($document->business_id);

        if (! $allowed) {
            abort(403);
        }

        return $this->uploads->downloadAuthorized($document, $user, $request);
    }

    private function assertOwner(Request $request, BusinessMembership $membership): void
    {
        if ($membership->user_id !== $request->user()->id) {
            abort(403);
        }
    }
}
