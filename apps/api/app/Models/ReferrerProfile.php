<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string|null $display_name
 * @property string|null $phone
 * @property Carbon|null $phone_verified_at
 */
class ReferrerProfile extends Model
{
    protected $fillable = [
        'user_id',
        'display_name',
        'phone',
        'phone_verified_at',
    ];

    protected function casts(): array
    {
        return [
            'phone_verified_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
