<?php

namespace Tests\Unit\Auth;

use App\Models\EmailOtp;
use App\Models\User;
use App\Notifications\EmailOtpNotification;
use App\Services\Auth\EmailOtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class EmailOtpServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_enable_issue_verify_and_disable_flow(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $service = app(EmailOtpService::class);

        $service->enable($user);
        $this->assertNotNull($user->fresh()->email_otp_enabled_at);

        $service->issue($user);
        Notification::assertSentTo($user, EmailOtpNotification::class);

        $otp = EmailOtp::query()->where('user_id', $user->id)->latest('id')->firstOrFail();
        $notification = Notification::sent($user, EmailOtpNotification::class)->first();
        $code = (new \ReflectionClass($notification))->getProperty('code')->getValue($notification);
        $this->assertIsString($code);

        $service->verify($user, $code);
        $this->assertNotNull($otp->fresh()->consumed_at);

        $service->disable($user);
        $this->assertNull($user->fresh()->email_otp_enabled_at);
    }

    public function test_issue_respects_resend_cooldown_and_verify_rejects_bad_code(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $service = app(EmailOtpService::class);

        $service->issue($user);

        try {
            $service->issue($user);
            $this->fail('Expected resend cooldown validation.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('email_otp', $e->errors());
        }

        try {
            $service->verify($user, '000000');
            $this->fail('Expected invalid code validation.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('code', $e->errors());
        }
    }
}
