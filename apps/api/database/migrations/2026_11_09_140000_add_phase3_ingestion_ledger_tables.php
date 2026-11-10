<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_credentials', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('website_id')->constrained()->cascadeOnDelete();
            $table->string('source', 64);
            $table->string('name');
            $table->string('token_hash', 64)->unique();
            $table->text('hmac_secret_encrypted');
            $table->json('scopes')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['business_id', 'source']);
            $table->index(['website_id', 'revoked_at']);
        });

        Schema::create('integration_nonces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('integration_credential_id')->constrained()->cascadeOnDelete();
            $table->string('nonce', 128);
            $table->timestamp('used_at');

            $table->unique(['integration_credential_id', 'nonce'], 'integration_nonce_unique');
            $table->index('used_at');
        });

        Schema::create('commission_rules', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('website_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('event_type', 64)->default('sale');
            $table->unsignedInteger('rate_bps')->default(0);
            $table->unsignedBigInteger('flat_minor')->default(0);
            $table->char('currency', 3)->default('EUR');
            $table->unsignedInteger('priority')->default(100);
            $table->unsignedInteger('version')->default(1);
            $table->timestamp('effective_from');
            $table->timestamp('effective_to')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['business_id', 'event_type', 'is_active', 'priority']);
        });

        Schema::create('commercial_events', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('website_id')->constrained()->cascadeOnDelete();
            $table->foreignId('integration_credential_id')->constrained()->cascadeOnDelete();
            $table->string('source', 64);
            $table->string('external_event_id', 191);
            $table->string('event_type', 64);
            $table->timestamp('occurred_at');
            $table->unsignedBigInteger('amount_minor');
            $table->char('currency', 3);
            $table->string('referral_code', 64)->nullable();
            $table->json('payload')->nullable();
            $table->string('status', 32)->default('received');
            $table->string('status_reason')->nullable();
            $table->timestamps();

            $table->unique(['business_id', 'source', 'external_event_id'], 'commercial_events_idempotency');
            $table->index(['business_id', 'status', 'occurred_at']);
        });

        Schema::create('commissions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('commercial_event_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('business_membership_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('referral_code_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('commission_rule_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('rule_version');
            $table->unsignedBigInteger('basis_amount_minor');
            $table->unsignedInteger('rate_bps');
            $table->unsignedBigInteger('flat_minor')->default(0);
            $table->unsignedBigInteger('commission_minor');
            $table->char('currency', 3);
            $table->string('status', 32)->default('pending');
            $table->timestamps();

            $table->index(['business_id', 'user_id', 'status']);
            $table->index(['business_membership_id', 'status']);
        });

        Schema::create('ledger_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->string('code', 128);
            $table->string('name');
            $table->string('account_type', 32);
            $table->foreignId('business_membership_id')->nullable()->constrained()->nullOnDelete();
            $table->char('currency', 3);
            $table->timestamps();

            $table->unique(['business_id', 'code']);
        });

        Schema::create('ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('commercial_event_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('commission_id')->nullable()->constrained()->nullOnDelete();
            $table->string('entry_type', 64);
            $table->string('idempotency_key', 191);
            $table->string('description')->nullable();
            $table->timestamp('posted_at');
            $table->timestamps();

            $table->unique(['business_id', 'idempotency_key'], 'ledger_entries_idempotency');
            $table->index(['business_id', 'entry_type', 'posted_at']);
        });

        Schema::create('ledger_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ledger_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ledger_account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->string('side', 8); // debit|credit
            $table->unsignedBigInteger('amount_minor');
            $table->timestamps();

            $table->index(['ledger_account_id', 'side']);
            $table->index(['business_id', 'ledger_entry_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ledger_lines');
        Schema::dropIfExists('ledger_entries');
        Schema::dropIfExists('ledger_accounts');
        Schema::dropIfExists('commissions');
        Schema::dropIfExists('commercial_events');
        Schema::dropIfExists('commission_rules');
        Schema::dropIfExists('integration_nonces');
        Schema::dropIfExists('integration_credentials');
    }
};
