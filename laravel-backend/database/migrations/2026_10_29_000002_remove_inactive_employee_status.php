<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // An inactive employee is no longer working here, so it is closest to resigned.
        DB::statement("ALTER TABLE employees MODIFY status ENUM('active','inactive','transferred','resigned') NOT NULL DEFAULT 'active'");
        DB::table('employees')->where('status', 'inactive')->update(['status' => 'resigned']);
        DB::statement("ALTER TABLE employees MODIFY status ENUM('active','transferred','resigned') NOT NULL DEFAULT 'active'");
    }

    public function down(): void
    {
        throw new RuntimeException('Status conversion is not reversible; use a reviewed backup for rollback.');
    }
};
