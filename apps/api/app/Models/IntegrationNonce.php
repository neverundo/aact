<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $integration_credential_id
 * @property string $nonce
 * @property Carbon $used_at
 */
class IntegrationNonce extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'integration_credential_id',
        'nonce',
        'used_at',
    ];

    protected function casts(): array
    {
        return [
            'used_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<IntegrationCredential, $this> */
    public function credential(): BelongsTo
    {
        return $this->belongsTo(IntegrationCredential::class, 'integration_credential_id');
    }
}
