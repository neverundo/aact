<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            $table->unsignedBigInteger('payout_threshold_minor')->default(5000)->after('currency');
        });

        Schema::table('commissions', function (Blueprint $table) {
            $table->unsignedBigInteger('reversed_minor')->default(0)->after('commission_minor');
        });

        Schema::table('commercial_events', function (Blueprint $table) {
            $table->string('related_external_event_id', 191)->nullable()->after('external_event_id');
            $table->index(['business_id', 'related_external_event_id'], 'commercial_events_related_idx');
        });

        Schema::create('payout_requests', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('business_membership_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_method_version_id')->constrained('payment_method_versions')->restrictOnDelete();
            $table->unsignedBigInteger('amount_minor');
            $table->char('currency', 3);
            $table->string('status', 32)->default('pending');
            $table->text('status_reason')->nullable();
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('paid_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('paid_at')->nullable();
            $table->string('external_reference')->nullable();
            $table->foreignId('ledger_entry_id')->nullable()->constrained('ledger_entries')->nullOnDelete();
            $table->timestamps();

            $table->index(['business_id', 'status']);
            $table->index(['business_membership_id', 'status']);
        });

        Schema::create('payout_request_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payout_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('private_document_id')->constrained()->cascadeOnDelete();
            $table->unique(['payout_request_id', 'private_document_id'], 'payout_request_document_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_request_documents');
        Schema::dropIfExists('payout_requests');

        Schema::table('commercial_events', function (Blueprint $table) {
            $table->dropIndex('commercial_events_related_idx');
            $table->dropColumn('related_external_event_id');
        });

        Schema::table('commissions', function (Blueprint $table) {
            $table->dropColumn('reversed_minor');
        });

        Schema::table('businesses', function (Blueprint $table) {
            $table->dropColumn('payout_threshold_minor');
        });
    }
};
