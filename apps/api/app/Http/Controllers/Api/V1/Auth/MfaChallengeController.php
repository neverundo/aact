<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Services\Auth\LoginService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MfaChallengeController extends Controller
{
    public function __construct(private readonly LoginService $login) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challenge_token' => ['required', 'string'],
            'method' => ['required', 'in:totp,email_otp,recovery_code'],
            'code' => ['required', 'string'],
        ]);

        $result = $this->login->verifyMfa(
            $request,
            $validated['challenge_token'],
            $validated['method'],
            $validated['code'],
        );

        return response()->json([
            'status' => $result['status'],
            'user' => (new UserResource($result['user']->load('memberships')))->resolve(),
        ]);
    }
}
