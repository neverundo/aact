<?php

namespace App\Policies;

use App\Models\Business;
use App\Models\User;

class BusinessPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isPlatformAdmin() || $user->isBusinessAdmin() || $user->memberships()->where('status', 'approved')->exists();
    }

    public function view(User $user, Business $business): bool
    {
        return $user->belongsToBusiness($business->id);
    }

    public function create(User $user): bool
    {
        return $user->isPlatformAdmin();
    }

    public function update(User $user, Business $business): bool
    {
        return $user->isPlatformAdmin() || $user->isBusinessAdmin($business->id);
    }

    public function delete(User $user, Business $_): bool
    {
        return $user->isPlatformAdmin();
    }
}
