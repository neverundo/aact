<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Website;

class WebsitePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isPlatformAdmin() || $user->isBusinessAdmin() || $user->memberships()->where('status', 'approved')->exists();
    }

    public function view(User $user, Website $website): bool
    {
        return $user->belongsToBusiness($website->business_id);
    }

    public function create(User $user): bool
    {
        return $user->isPlatformAdmin() || $user->isBusinessAdmin();
    }

    public function update(User $user, Website $website): bool
    {
        return $user->isPlatformAdmin() || $user->isBusinessAdmin($website->business_id);
    }

    public function delete(User $user, Website $website): bool
    {
        return $user->isPlatformAdmin() || $user->isBusinessAdmin($website->business_id);
    }
}
