<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $business_id
 * @property string|null $display_name
 * @property string $primary_color
 * @property string $secondary_color
 * @property string $accent_color
 * @property string|null $logo_path
 * @property string|null $logo_disk
 * @property string|null $logo_mime
 */
class BusinessBranding extends Model
{
    protected $fillable = [
        'business_id',
        'display_name',
        'primary_color',
        'secondary_color',
        'accent_color',
        'logo_path',
        'logo_disk',
        'logo_mime',
    ];

    /** @return BelongsTo<Business, $this> */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function hasLogo(): bool
    {
        return filled($this->logo_path) && filled($this->logo_disk);
    }
}
