<?php

namespace App\Enums;

enum LedgerAccountType: string
{
    case Expense = 'expense';
    case Payable = 'payable';
    case Clearing = 'clearing';
}
