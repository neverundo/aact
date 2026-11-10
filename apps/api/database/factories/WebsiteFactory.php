<?php

namespace Database\Factories;

use App\Models\Business;
use App\Models\Website;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Website>
 */
class WebsiteFactory extends Factory
{
    protected $model = Website::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'business_id' => Business::factory(),
            'name' => fake()->domainWord().' site',
            'base_url' => 'https://'.fake()->unique()->domainName(),
            'is_active' => true,
        ];
    }
}
