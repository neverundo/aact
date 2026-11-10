<?php

namespace App\Services\Commission;

use App\Models\Business;
use App\Models\User;
use App\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

final readonly class CreateCommissionRuleData
{
    public function __construct(
        public User $actor,
        public Business $business,
        public string $name,
        public string $eventType,
        public int $rateBps,
        public int $flatMinor,
        public int $priority,
        public Carbon $effectiveFrom,
        public ?Website $website = null,
        public ?Carbon $effectiveTo = null,
        public ?Request $request = null,
    ) {}
}
