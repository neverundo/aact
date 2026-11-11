<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;

class LocaleController extends Controller
{
    public function update(Request $request): UserResource
    {
        $validated = $request->validate([
            'locale' => ['required', 'string', 'in:pt,en'],
        ]);

        $user = $request->user();
        $user->preferred_locale = $validated['locale'];
        $user->save();

        return new UserResource($user->load('memberships'));
    }
}
