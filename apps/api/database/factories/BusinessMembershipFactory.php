<?php

namespace Database\Factories;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BusinessMembership>
 */
class BusinessMembershipFactory extends Factory
{
    protected $model = BusinessMembership::class;

    public function definition(): array
    {
        return [
            'business_id' => Business::factory(),
            'user_id' => User::factory(),
            'role' => MembershipRole::BusinessAdmin,
            'status' => MembershipStatus::Approved,
        ];
    }

    public function referrer(): static
    {
        return $this->state(fn () => ['role' => MembershipRole::Referrer]);
    }

    public function admin(): static
    {
        return $this->state(fn () => ['role' => MembershipRole::BusinessAdmin]);
    }
}
