<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referrer_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('display_name')->nullable();
            $table->string('phone', 32)->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            $table->timestamps();
        });

        Schema::create('invitations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invited_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('email');
            $table->string('name')->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->foreignId('accepted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedSmallInteger('resend_count')->default(0);
            $table->timestamp('last_sent_at')->nullable();
            $table->timestamps();

            $table->index(['business_id', 'email']);
            $table->index(['expires_at', 'revoked_at', 'accepted_at']);
        });

        Schema::create('invitation_website', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invitation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('website_id')->constrained()->cascadeOnDelete();
            $table->unique(['invitation_id', 'website_id']);
        });

        Schema::table('business_memberships', function (Blueprint $table) {
            $table->foreignId('invitation_id')->nullable()->after('status')->constrained('invitations')->nullOnDelete();
            $table->timestamp('approved_at')->nullable()->after('invitation_id');
            $table->foreignId('approved_by_user_id')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();
            $table->text('status_reason')->nullable()->after('approved_by_user_id');
        });

        Schema::create('membership_website', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_membership_id')->constrained()->cascadeOnDelete();
            $table->foreignId('website_id')->constrained()->cascadeOnDelete();
            $table->unique(['business_membership_id', 'website_id'], 'membership_website_unique');
        });

        Schema::create('payment_method_versions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('business_membership_id')->constrained()->cascadeOnDelete();
            $table->string('method_type', 32);
            $table->text('payload_encrypted');
            $table->string('display_mask', 64);
            $table->string('status', 32)->default('pending_review');
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['business_membership_id', 'status']);
            $table->unique(['business_membership_id', 'version']);
        });

        Schema::create('private_documents', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('business_membership_id')->nullable()->constrained()->nullOnDelete();
            $table->string('purpose', 64);
            $table->string('disk', 32)->default('private_documents');
            $table->string('path');
            $table->string('original_filename');
            $table->string('mime', 127);
            $table->unsignedBigInteger('size_bytes');
            $table->string('scan_status', 32)->default('quarantine');
            $table->timestamp('scanned_at')->nullable();
            $table->string('scan_engine')->nullable();
            $table->timestamps();

            $table->index(['business_id', 'scan_status']);
        });

        Schema::create('referral_codes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('business_membership_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('website_id')->nullable()->constrained()->nullOnDelete();
            $table->string('code', 32);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['business_id', 'code']);
            $table->index(['business_membership_id', 'is_active']);
        });

        Schema::create('audit_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('business_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 64);
            $table->string('entity_type', 64)->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('result', 32)->default('success');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('context')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['business_id', 'action', 'created_at']);
            $table->index(['entity_type', 'entity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_events');
        Schema::dropIfExists('referral_codes');
        Schema::dropIfExists('private_documents');
        Schema::dropIfExists('payment_method_versions');
        Schema::dropIfExists('membership_website');

        Schema::table('business_memberships', function (Blueprint $table) {
            $table->dropConstrainedForeignId('invitation_id');
            $table->dropConstrainedForeignId('approved_by_user_id');
            $table->dropColumn(['approved_at', 'status_reason']);
        });

        Schema::dropIfExists('invitation_website');
        Schema::dropIfExists('invitations');
        Schema::dropIfExists('referrer_profiles');
    }
};
