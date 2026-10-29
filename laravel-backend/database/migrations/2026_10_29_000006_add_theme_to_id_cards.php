<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('id_cards', function (Blueprint $table) {
            $table->string('theme', 20)->default('navy');
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Preserve card themes; restore a reviewed backup instead.');
    }
};
