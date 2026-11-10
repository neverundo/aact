<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Models\ReferrerProfile;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $profile = ReferrerProfile::query()->firstOrCreate(
            ['user_id' => $request->user()->id],
            ['display_name' => $request->user()->name]
        );

        return response()->json([
            'display_name' => $profile->display_name,
            'phone' => $profile->phone,
            'phone_verified' => false,
            'email' => $request->user()->email,
            'email_verified' => $request->user()->hasVerifiedEmail(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'display_name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
        ]);

        $profile = ReferrerProfile::query()->firstOrCreate(['user_id' => $request->user()->id]);

        if (array_key_exists('phone', $validated) && filled($validated['phone'])) {
            $validated['phone'] = PhoneNumber::normalize($validated['phone']);
            $validated['phone_verified_at'] = null; // never present as verified in MVP
        }

        $profile->fill($validated)->save();

        return $this->show($request);
    }
}
