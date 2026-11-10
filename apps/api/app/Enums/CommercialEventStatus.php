<?php

namespace App\Enums;

enum CommercialEventStatus: string
{
    case Received = 'received';
    case Attributed = 'attributed';
    case Ignored = 'ignored';
    case Failed = 'failed';
}
