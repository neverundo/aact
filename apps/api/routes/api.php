<?php

use App\Http\Controllers\Api\V1\Admin\BusinessBrandingController;
use App\Http\Controllers\Api\V1\Admin\BusinessController;
use App\Http\Controllers\Api\V1\Admin\CommercialEventController;
use App\Http\Controllers\Api\V1\Admin\CommissionController as AdminCommissionController;
use App\Http\Controllers\Api\V1\Admin\CommissionRuleController;
use App\Http\Controllers\Api\V1\Admin\IntegrationCredentialController;
use App\Http\Controllers\Api\V1\Admin\InvitationController as AdminInvitationController;
use App\Http\Controllers\Api\V1\Admin\MembershipController as AdminMembershipController;
use App\Http\Controllers\Api\V1\Admin\PaymentMethodReviewController;
use App\Http\Controllers\Api\V1\Admin\PayoutRequestController as AdminPayoutRequestController;
use App\Http\Controllers\Api\V1\Admin\WebsiteController;
use App\Http\Controllers\Api\V1\Auth\EmailOtpController;
use App\Http\Controllers\Api\V1\Auth\EmailVerificationController;
use App\Http\Controllers\Api\V1\Auth\LocaleController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\Auth\MfaChallengeController;
use App\Http\Controllers\Api\V1\Auth\PasswordController;
use App\Http\Controllers\Api\V1\Auth\RecoveryCodeController;
use App\Http\Controllers\Api\V1\Auth\SessionController;
use App\Http\Controllers\Api\V1\Auth\StepUpController;
use App\Http\Controllers\Api\V1\Auth\TotpController;
use App\Http\Controllers\Api\V1\BrandingAssetController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Integration\EventIngestionController;
use App\Http\Controllers\Api\V1\Portal\BrandingController as PortalBrandingController;
use App\Http\Controllers\Api\V1\Portal\CommissionController as PortalCommissionController;
use App\Http\Controllers\Api\V1\Portal\DocumentController;
use App\Http\Controllers\Api\V1\Portal\InvitationAcceptanceController;
use App\Http\Controllers\Api\V1\Portal\MembershipController as PortalMembershipController;
use App\Http\Controllers\Api\V1\Portal\PaymentMethodController;
use App\Http\Controllers\Api\V1\Portal\PayoutRequestController as PortalPayoutRequestController;
use App\Http\Controllers\Api\V1\Portal\ProfileController;
use App\Http\Controllers\Api\V1\Portal\ReferralCodeController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthController::class)->name('api.v1.health');

    Route::prefix('auth')->group(function (): void {
        Route::post('/login', [LoginController::class, 'store'])
            ->middleware('throttle:10,1')
            ->name('api.v1.auth.login');

        Route::post('/mfa/verify', [MfaChallengeController::class, 'store'])
            ->middleware('throttle:20,1')
            ->name('api.v1.auth.mfa.verify');

        Route::post('/password/forgot', [PasswordController::class, 'forgot'])
            ->middleware('throttle:5,1')
            ->name('api.v1.auth.password.forgot');

        Route::post('/password/reset', [PasswordController::class, 'reset'])
            ->middleware('throttle:5,1')
            ->name('api.v1.auth.password.reset');

        Route::middleware('auth:sanctum')->group(function (): void {
            Route::post('/logout', [LoginController::class, 'destroy'])->name('api.v1.auth.logout');
            Route::get('/me', MeController::class)->name('api.v1.auth.me');
            Route::patch('/locale', [LocaleController::class, 'update'])->name('api.v1.auth.locale');

            Route::get('/email/verification-status', [EmailVerificationController::class, 'notice']);
            Route::post('/email/verification-notification', [EmailVerificationController::class, 'send'])
                ->middleware('throttle:6,1');
            Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
                ->middleware(['signed', 'throttle:6,1'])
                ->name('verification.verify');

            Route::put('/password', [PasswordController::class, 'update']);

            Route::post('/mfa/totp/begin', [TotpController::class, 'begin']);
            Route::post('/mfa/totp/confirm', [TotpController::class, 'confirm']);
            Route::delete('/mfa/totp', [TotpController::class, 'destroy']);

            Route::post('/mfa/email-otp/enable', [EmailOtpController::class, 'enable']);
            Route::delete('/mfa/email-otp', [EmailOtpController::class, 'disable']);
            Route::post('/mfa/email-otp/resend', [EmailOtpController::class, 'resend'])
                ->middleware('throttle:5,1');

            Route::post('/mfa/recovery-codes/regenerate', [RecoveryCodeController::class, 'regenerate']);
            Route::post('/step-up', [StepUpController::class, 'store'])
                ->middleware('throttle:10,1');

            Route::get('/sessions', [SessionController::class, 'index']);
            Route::delete('/sessions/{sessionId}', [SessionController::class, 'destroy']);
            Route::delete('/sessions', [SessionController::class, 'destroyOthers']);
        });
    });

    Route::get('/invitations/{uuid}', [InvitationAcceptanceController::class, 'show'])
        ->middleware('throttle:30,1');
    Route::post('/invitations/{uuid}/register', [InvitationAcceptanceController::class, 'register'])
        ->middleware('throttle:10,1');

    Route::post('/integration/events', [EventIngestionController::class, 'store'])
        ->middleware('throttle:120,1')
        ->name('api.v1.integration.events');

    Route::get('/branding/businesses/{business}/logo', [BrandingAssetController::class, 'businessLogo'])
        ->middleware('throttle:60,1');
    Route::get('/branding/websites/{website}/{asset}', [BrandingAssetController::class, 'websiteAsset'])
        ->where('asset', 'logo|favicon')
        ->middleware('throttle:60,1');
    Route::get('/branding/businesses/{business}', [PortalBrandingController::class, 'forBusiness'])
        ->middleware('throttle:60,1');

    Route::middleware('auth:sanctum')->prefix('portal')->group(function (): void {
        // Invitation accept stays reachable during MFA setup so onboarding can complete.
        Route::post('/invitations/{uuid}/accept', [InvitationAcceptanceController::class, 'accept']);

        Route::middleware('fully.authenticated')->group(function (): void {
            Route::get('/profile', [ProfileController::class, 'show']);
            Route::put('/profile', [ProfileController::class, 'update']);
            Route::get('/branding', [PortalBrandingController::class, 'show']);
            Route::get('/memberships', [PortalMembershipController::class, 'index']);
            Route::get('/memberships/{membership}', [PortalMembershipController::class, 'show']);
            Route::post('/memberships/{membership}/payment-methods', [PaymentMethodController::class, 'store']);
            Route::get('/memberships/{membership}/documents', [DocumentController::class, 'index']);
            Route::post('/memberships/{membership}/documents', [DocumentController::class, 'store']);
            Route::get('/documents/{uuid}/download', [DocumentController::class, 'download']);
            Route::get('/referral-codes', [ReferralCodeController::class, 'index']);
            Route::post('/referral-codes/{referralCode}/link', [ReferralCodeController::class, 'link']);
            Route::post('/referral-codes/{referralCode}/qr', [ReferralCodeController::class, 'qr']);
            Route::get('/commissions', [PortalCommissionController::class, 'index']);
            Route::get('/balances', [PortalCommissionController::class, 'balances']);
            Route::get('/payout-requests', [PortalPayoutRequestController::class, 'index']);
            Route::post('/payout-requests', [PortalPayoutRequestController::class, 'store']);
        });
    });

    Route::middleware(['auth:sanctum', 'admin.access'])
        ->prefix('admin')
        ->group(function (): void {
            Route::apiResource('businesses', BusinessController::class);
            Route::apiResource('websites', WebsiteController::class);

            Route::get('businesses/{business}/branding', [BusinessBrandingController::class, 'show']);
            Route::put('businesses/{business}/branding', [BusinessBrandingController::class, 'update']);
            Route::post('businesses/{business}/branding/logo', [BusinessBrandingController::class, 'uploadLogo']);
            Route::post('websites/{website}/fetch-brand-assets', [BusinessBrandingController::class, 'fetchWebsiteAssets']);

            Route::get('invitations', [AdminInvitationController::class, 'index']);
            Route::post('invitations', [AdminInvitationController::class, 'store']);
            Route::post('invitations/{invitation}/revoke', [AdminInvitationController::class, 'revoke']);
            Route::post('invitations/{invitation}/resend', [AdminInvitationController::class, 'resend']);

            Route::get('memberships', [AdminMembershipController::class, 'index']);
            Route::get('memberships/{membership}', [AdminMembershipController::class, 'show']);
            Route::post('memberships/{membership}/approve', [AdminMembershipController::class, 'approve']);
            Route::post('memberships/{membership}/reject', [AdminMembershipController::class, 'reject']);
            Route::post('memberships/{membership}/suspend', [AdminMembershipController::class, 'suspend']);

            Route::get('payment-methods', [PaymentMethodReviewController::class, 'index']);
            Route::post('payment-methods/{paymentMethodVersion}/review', [PaymentMethodReviewController::class, 'review']);
            Route::post('payment-methods/{paymentMethodVersion}/reveal', [PaymentMethodReviewController::class, 'reveal'])
                ->middleware('step.up');

            Route::get('integrations', [IntegrationCredentialController::class, 'index']);
            Route::post('integrations', [IntegrationCredentialController::class, 'store'])
                ->middleware('step.up');
            Route::post('integrations/{integrationCredential}/revoke', [IntegrationCredentialController::class, 'revoke']);
            Route::post('integrations/{integrationCredential}/rotate', [IntegrationCredentialController::class, 'rotate'])
                ->middleware('step.up');

            Route::get('commission-rules', [CommissionRuleController::class, 'index']);
            Route::post('commission-rules', [CommissionRuleController::class, 'store']);
            Route::post('commission-rules/{commissionRule}/deactivate', [CommissionRuleController::class, 'deactivate']);

            Route::get('commercial-events', [CommercialEventController::class, 'index']);
            Route::get('commissions', [AdminCommissionController::class, 'index']);

            Route::get('payout-requests', [AdminPayoutRequestController::class, 'index']);
            Route::post('payout-requests/{payoutRequest}/approve', [AdminPayoutRequestController::class, 'approve']);
            Route::post('payout-requests/{payoutRequest}/reject', [AdminPayoutRequestController::class, 'reject']);
            Route::post('payout-requests/{payoutRequest}/mark-paid', [AdminPayoutRequestController::class, 'markPaid'])
                ->middleware('step.up');
        });
});
