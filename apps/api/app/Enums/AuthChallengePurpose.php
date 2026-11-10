<?php

namespace App\Enums;

enum AuthChallengePurpose: string
{
    case Login = 'login';
    case StepUp = 'step_up';
}
