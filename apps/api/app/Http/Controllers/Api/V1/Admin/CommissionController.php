<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CommissionResource;
use App\Models\Commission;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CommissionController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $query = Commission::query()->with(['event', 'rule', 'membership'])->latest('id');

        if (! $user->isPlatformAdmin()) {
            $query->whereIn('business_id', $user->accessibleBusinessIds());
        }

        if ($request->filled('business_id')) {
            $businessId = (int) $request->integer('business_id');
            if (! $user->belongsToBusiness($businessId)) {
                abort(403);
            }
            $query->where('business_id', $businessId);
        }

        return CommissionResource::collection($query->paginate(25));
    }
}
