<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ledger_lines', function (Blueprint $table): void {
            $table->dropForeign(['ledger_entry_id']);
            $table->dropForeign(['ledger_account_id']);
        });

        Schema::table('ledger_lines', function (Blueprint $table): void {
            $table->foreign('ledger_entry_id')
                ->references('id')
                ->on('ledger_entries')
                ->restrictOnDelete();
            $table->foreign('ledger_account_id')
                ->references('id')
                ->on('ledger_accounts')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ledger_lines', function (Blueprint $table): void {
            $table->dropForeign(['ledger_entry_id']);
            $table->dropForeign(['ledger_account_id']);
        });

        Schema::table('ledger_lines', function (Blueprint $table): void {
            $table->foreign('ledger_entry_id')
                ->references('id')
                ->on('ledger_entries')
                ->cascadeOnDelete();
            $table->foreign('ledger_account_id')
                ->references('id')
                ->on('ledger_accounts')
                ->cascadeOnDelete();
        });
    }
};
