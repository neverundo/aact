<?php

namespace App\Enums;

enum DocumentScanStatus: string
{
    case Quarantine = 'quarantine';
    case Clean = 'clean';
    case Infected = 'infected';
    case Unavailable = 'unavailable';
}
