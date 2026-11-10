<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Services\Auth\LoginService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoginController extends Controller
{
    public function __construct(private readonly LoginService $login) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        $result = $this->login->attempt($request, $validated['email'], $validated['password']);

        if ($result['status'] === 'mfa_required') {
            return response()->json([
                'status' => $result['status'],
                'challenge_id' => $result['challenge_id'],
                'challenge_token' => $result['challenge_token'],
                'methods' => $result['methods'],
                'expires_at' => $result['expires_at'],
            ]);
        }

        return response()->json([
            'status' => $result['status'],
            'user' => (new UserResource($result['user']->load('memberships')))->resolve(),
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $this->login->logout($request);

        return response()->json(['status' => 'logged_out']);
    }
}
