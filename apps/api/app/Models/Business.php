<?php

namespace App\Models;

use Database\Factories\BusinessFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class Business extends Model
{
    /** @use HasFactory<BusinessFactory> */
    use HasFactory;

    protected $fillable = [
        'uuid',
        'name',
        'slug',
        'currency',
        'payout_threshold_minor',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'payout_threshold_minor' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Business $business): void {
            if (blank($business->uuid)) {
                $business->uuid = (string) Str::uuid();
            }
        });
    }

    /** @return HasMany<Website, $this> */
    public function websites(): HasMany
    {
        return $this->hasMany(Website::class);
    }

    /** @return HasMany<BusinessMembership, $this> */
    public function memberships(): HasMany
    {
        return $this->hasMany(BusinessMembership::class);
    }

    /** @return HasOne<BusinessBranding, $this> */
    public function branding(): HasOne
    {
        return $this->hasOne(BusinessBranding::class);
    }
}
