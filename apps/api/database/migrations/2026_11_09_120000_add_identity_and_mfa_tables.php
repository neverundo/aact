<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('platform_role', 32)->nullable()->after('password');
            $table->text('totp_secret')->nullable()->after('platform_role');
            $table->timestamp('totp_confirmed_at')->nullable()->after('totp_secret');
            $table->unsignedBigInteger('totp_last_timestep')->nullable()->after('totp_confirmed_at');
            $table->timestamp('email_otp_enabled_at')->nullable()->after('totp_last_timestep');
            $table->timestamp('password_changed_at')->nullable()->after('email_otp_enabled_at');
        });

        Schema::create('businesses', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name');
            $table->string('slug')->unique();
            $table->char('currency', 3)->default('EUR');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('websites', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('base_url');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['business_id', 'base_url']);
        });

        Schema::create('business_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 32);
            $table->string('status', 32)->default('approved');
            $table->timestamps();

            $table->unique(['business_id', 'user_id', 'role']);
            $table->index(['user_id', 'role']);
        });

        Schema::create('auth_challenges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('purpose', 32);
            $table->string('token_hash', 64)->unique();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->unsignedTinyInteger('max_attempts');
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'purpose', 'expires_at']);
        });

        Schema::create('email_otps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('auth_challenge_id')->nullable()->constrained('auth_challenges')->nullOnDelete();
            $table->string('code_hash', 64);
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->unsignedTinyInteger('max_attempts');
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamp('sent_at');
            $table->timestamps();

            $table->index(['user_id', 'expires_at']);
        });

        Schema::create('recovery_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('code_hash', 64)->unique();
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'consumed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recovery_codes');
        Schema::dropIfExists('email_otps');
        Schema::dropIfExists('auth_challenges');
        Schema::dropIfExists('business_memberships');
        Schema::dropIfExists('websites');
        Schema::dropIfExists('businesses');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'platform_role',
                'totp_secret',
                'totp_confirmed_at',
                'totp_last_timestep',
                'email_otp_enabled_at',
                'password_changed_at',
            ]);
        });
    }
};
