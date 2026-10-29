<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Widen first so existing rows can be converted, then narrow to the final role set.
        DB::statement("ALTER TABLE users MODIFY role ENUM('admin','co-admin','manager','superadmin') NOT NULL");
        DB::table('users')->where('role', 'admin')->update(['role' => 'superadmin']);
        DB::table('users')->where('role', 'co-admin')->update(['role' => 'manager']);
        DB::statement("ALTER TABLE users MODIFY role ENUM('superadmin','manager') NOT NULL");

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Role conversion is not reversible; use a reviewed backup for rollback.');
    }
};
