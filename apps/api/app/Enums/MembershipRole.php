<?php

namespace App\Enums;

enum MembershipRole: string
{
    case BusinessAdmin = 'business_admin';
    case Referrer = 'referrer';
}
