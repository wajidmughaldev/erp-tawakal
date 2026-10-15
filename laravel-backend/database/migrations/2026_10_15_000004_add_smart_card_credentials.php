<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('id_cards', function (Blueprint $table) {
            $table->string('card_number')->nullable()->change();
            $table->string('qr_code_hash')->nullable()->change();
            // Retain every legacy status/value rather than rewriting historical records.
            $table->enum('status', ['active', 'expired', 'revoked', 'pending_print', 'replaced'])->default('active')->change();
            $table->char('verification_token_digest', 64)->nullable()->unique();
            $table->text('verification_token')->nullable();
            $table->foreignId('current_employee_id')->nullable()->unique()->constrained('employees')->restrictOnDelete();
            $table->foreignId('issued_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->enum('validity_policy', ['eleven_months', 'selected_years'])->nullable();
            $table->unsignedTinyInteger('validity_years')->nullable();
        });
        Schema::create('card_lifecycle_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('card_id')->constrained('id_cards')->restrictOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->restrictOnDelete();
            $table->enum('operation', ['issuance', 'renewal', 'replacement', 'reissue', 'deactivation']);
            $table->foreignId('administrator_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('occurred_at', 6);
            $table->text('reason')->nullable();
            $table->foreignId('previous_card_id')->nullable()->constrained('id_cards')->restrictOnDelete();
            $table->foreignId('new_card_id')->nullable()->constrained('id_cards')->restrictOnDelete();
            $table->date('previous_expiry')->nullable();
            $table->date('new_expiry')->nullable();
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Smart-card history and credentials must be preserved. Restore a reviewed backup instead of rolling back this migration.');
    }
};
