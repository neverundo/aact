<?php

namespace App\Enums;

enum PaymentMethodStatus: string
{
    case PendingReview = 'pending_review';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Superseded = 'superseded';
}
