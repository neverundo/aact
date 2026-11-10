<?php

return [
    /*
     | Comma-separated proxy IPs/CIDRs. Use "*" only behind a trusted local gateway.
     | Empty string disables trusting proxies (safe production default when unset).
     */
    'trusted_proxies' => env('TRUSTED_PROXIES', env('APP_ENV') === 'production' ? '' : '*'),

    'mfa' => [
        'challenge_ttl_seconds' => (int) env('AACT_MFA_CHALLENGE_TTL', 300),
        'challenge_max_attempts' => (int) env('AACT_MFA_CHALLENGE_MAX_ATTEMPTS', 5),
        'email_otp_ttl_seconds' => (int) env('AACT_EMAIL_OTP_TTL', 600),
        'email_otp_max_attempts' => (int) env('AACT_EMAIL_OTP_MAX_ATTEMPTS', 5),
        'email_otp_resend_seconds' => (int) env('AACT_EMAIL_OTP_RESEND', 60),
        'totp_window' => (int) env('AACT_TOTP_WINDOW', 1),
        'recovery_code_count' => 10,
        'admin_totp_required' => filter_var(
            env('AACT_ADMIN_TOTP_REQUIRED', env('APP_ENV') === 'production' ? 'true' : 'false'),
            FILTER_VALIDATE_BOOL
        ),
        'step_up_ttl_seconds' => (int) env('AACT_STEP_UP_TTL', 900),
    ],
    'password' => [
        'min_length' => (int) env('AACT_PASSWORD_MIN_LENGTH', 12),
    ],
    'session' => [
        'inactivity_minutes' => (int) env('AACT_SESSION_INACTIVITY_MINUTES', 120),
    ],
    'invitations' => [
        'ttl_hours' => (int) env('AACT_INVITATION_TTL_HOURS', 72),
        'max_resends' => (int) env('AACT_INVITATION_MAX_RESENDS', 5),
        'resend_cooldown_seconds' => (int) env('AACT_INVITATION_RESEND_COOLDOWN', 60),
    ],
    'documents' => [
        'max_bytes' => (int) env('AACT_DOCUMENT_MAX_BYTES', 5_242_880),
        'allowed_mimes' => ['application/pdf', 'image/jpeg', 'image/png'],
        'allowed_extensions' => ['pdf', 'jpg', 'jpeg', 'png'],
        'scanner' => env('AACT_FILE_SCANNER', 'auto'), // auto|clamav|unavailable|fake
        'clamav_host' => env('AACT_CLAMAV_HOST', 'clamav'),
        'clamav_port' => (int) env('AACT_CLAMAV_PORT', 3310),
    ],
    'referral' => [
        'code_length' => 10,
        'code_prefix' => env('AACT_REFERRAL_CODE_PREFIX', 'REF'),
    ],
    'integration' => [
        'timestamp_skew_seconds' => (int) env('AACT_INTEGRATION_TIMESTAMP_SKEW', 300),
    ],
];
