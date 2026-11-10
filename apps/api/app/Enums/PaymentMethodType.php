<?php

namespace App\Enums;

enum PaymentMethodType: string
{
    case Iban = 'iban';
    case MbWay = 'mbway';
}
