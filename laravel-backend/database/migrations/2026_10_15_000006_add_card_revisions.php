<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('id_cards', function (Blueprint $table) {
            $table->unsignedBigInteger('revision')->default(1);
        });
        Schema::table('card_renewal_operations', function (Blueprint $table) {
            // Existing operations have no provable original revision; retain them without guessing.
            $table->unsignedBigInteger('original_revision')->nullable();
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Preserve card revisions and renewal history; use a reviewed backup for rollback.');
    }
};
