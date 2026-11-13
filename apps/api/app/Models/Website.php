<?php

namespace App\Models;

use Database\Factories\WebsiteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property Carbon|null $logo_fetched_at
 */
class Website extends Model
{
    /** @use HasFactory<WebsiteFactory> */
    use HasFactory;

    protected $fillable = [
        'uuid',
        'business_id',
        'name',
        'base_url',
        'is_active',
        'favicon_path',
        'logo_path',
        'brand_disk',
        'favicon_source_url',
        'logo_source_url',
        'logo_fetched_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'logo_fetched_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Website $website): void {
            if (blank($website->uuid)) {
                $website->uuid = (string) Str::uuid();
            }
        });
    }

    /** @return BelongsTo<Business, $this> */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
