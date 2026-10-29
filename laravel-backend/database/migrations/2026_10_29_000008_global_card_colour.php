<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The card colour is now one setting for every card, so the per-card theme goes away.
        Schema::table('id_cards', function (Blueprint $table) {
            $table->dropColumn('theme');
        });
        Schema::create('app_settings', function (Blueprint $table) {
            $table->string('key', 100)->primary();
            $table->text('value')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Restore a reviewed backup instead of rolling back settings.');
    }
};
