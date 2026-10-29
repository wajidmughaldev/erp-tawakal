<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 50)->nullable()->after('username');
            $table->string('department', 120)->nullable()->after('phone');
            $table->string('branch', 120)->nullable()->after('department');
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Preserve manager profiles; restore a reviewed backup instead.');
    }
};
