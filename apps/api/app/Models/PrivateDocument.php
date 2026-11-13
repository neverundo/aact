<?php

namespace App\Models;

use App\Enums\DocumentScanStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $uuid
 * @property int $user_id
 * @property int $business_id
 * @property int|null $business_membership_id
 * @property string $purpose
 * @property string $disk
 * @property string $path
 * @property string $original_filename
 * @property string $mime
 * @property int $size_bytes
 * @property DocumentScanStatus $scan_status
 * @property Carbon|null $scanned_at
 * @property string|null $scan_engine
 */
class PrivateDocument extends Model
{
    protected $fillable = [
        'uuid',
        'user_id',
        'business_id',
        'business_membership_id',
        'purpose',
        'disk',
        'path',
        'original_filename',
        'mime',
        'size_bytes',
        'scan_status',
        'scanned_at',
        'scan_engine',
    ];

    protected function casts(): array
    {
        return [
            'scan_status' => DocumentScanStatus::class,
            'scanned_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (PrivateDocument $document): void {
            if (blank($document->uuid)) {
                $document->uuid = (string) Str::uuid();
            }
        });
    }

    public function isUsable(): bool
    {
        return $this->scan_status === DocumentScanStatus::Clean;
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Business, $this> */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    /** @return BelongsTo<BusinessMembership, $this> */
    public function membership(): BelongsTo
    {
        return $this->belongsTo(BusinessMembership::class, 'business_membership_id');
    }
}
