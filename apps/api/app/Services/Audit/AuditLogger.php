<?php

namespace App\Services\Audit;

use App\Models\AuditEvent;
use App\Models\User;
use Illuminate\Http\Request;

class AuditLogger
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function log(
        string $action,
        ?User $actor = null,
        ?int $businessId = null,
        ?AuditEntity $entity = null,
        string $result = 'success',
        array $context = [],
        ?Request $request = null,
    ): void {
        // Never persist secrets/full banking data.
        unset(
            $context['password'],
            $context['token'],
            $context['iban'],
            $context['secret'],
            $context['otp'],
            $context['payload']
        );

        $correlationId = $request?->attributes->get('correlation_id');
        if (is_string($correlationId) && $correlationId !== '') {
            $context['correlation_id'] = $correlationId;
        }

        AuditEvent::query()->create([
            'actor_user_id' => $actor?->id,
            'business_id' => $businessId,
            'action' => $action,
            'entity_type' => $entity?->type,
            'entity_id' => $entity?->id,
            'result' => $result,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'context' => $context === [] ? null : $context,
            'created_at' => now(),
        ]);
    }
}
