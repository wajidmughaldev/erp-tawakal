<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('id_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->string('card_number')->unique(); // e.g. CARD-00421
            $table->string('qr_code_hash')->unique();
            $table->date('issued_date');
            $table->date('expiry_date');
            $table->enum('status', ['active', 'expired', 'revoked', 'pending_print'])->default('active');
            $table->string('printed_by')->nullable();
            $table->timestamp('last_verified_at')->nullable();
            $table->integer('verification_count')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('id_cards');
    }
};
