<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('card_renewal_operations', function (Blueprint $table) {
            $table->id();
            $table->char('key_digest', 64)->unique();
            $table->foreignId('administrator_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('card_id')->constrained('id_cards')->restrictOnDelete();
            $table->enum('option', ['existing', 'new_physical']);
            $table->unsignedTinyInteger('requested_years')->nullable();
            $table->foreignId('result_card_id')->constrained('id_cards')->restrictOnDelete();
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Preserve renewal replay protection; restore a reviewed backup instead of dropping operation records.');
    }
};
