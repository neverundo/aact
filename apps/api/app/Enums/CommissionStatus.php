<?php

namespace App\Enums;

enum CommissionStatus: string
{
    case Pending = 'pending';
    case Available = 'available';
    case Reversed = 'reversed';
}
