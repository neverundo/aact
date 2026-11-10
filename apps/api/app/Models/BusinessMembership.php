<?php

namespace App\Models;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use Database\Factories\BusinessMembershipFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $business_id
 * @property int $user_id
 * @property MembershipRole $role
 * @property MembershipStatus $status
 * @property int|null $invitation_id
 * @property Carbon|null $approved_at
 * @property int|null $approved_by_user_id
 * @property string|null $status_reason
 */
class BusinessMembership extends Model
{
    /** @use HasFactory<BusinessMembershipFactory> */
    use HasFactory;

    protected $fillable = [
        'business_id',
        'user_id',
        'role',
        'status',
        'invitation_id',
        'approved_at',
        'approved_by_user_id',
        'status_reason',
    ];

    protected function casts(): array
    {
        return [
            'role' => MembershipRole::class,
            'status' => MembershipStatus::class,
            'approved_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Business, $this> */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Invitation, $this> */
    public function invitation(): BelongsTo
    {
        return $this->belongsTo(Invitation::class);
    }

    /** @return BelongsToMany<Website, $this> */
    public function websites(): BelongsToMany
    {
        return $this->belongsToMany(Website::class, 'membership_website');
    }

    /** @return HasMany<PaymentMethodVersion, $this> */
    public function paymentMethodVersions(): HasMany
    {
        return $this->hasMany(PaymentMethodVersion::class);
    }

    /** @return HasMany<ReferralCode, $this> */
    public function referralCodes(): HasMany
    {
        return $this->hasMany(ReferralCode::class);
    }

    public function isApproved(): bool
    {
        return $this->status === MembershipStatus::Approved;
    }
}
