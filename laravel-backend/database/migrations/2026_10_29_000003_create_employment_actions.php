<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('location', 120)->nullable()->after('department');
        });
        Schema::create('employment_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->restrictOnDelete();
            $table->enum('type', ['transfer', 'resign', 'other']);
            $table->date('effective_date');
            $table->json('details');
            $table->foreignId('administrator_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at');
            $table->index(['employee_id', 'created_at']);
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Preserve employment records; restore a reviewed backup instead of dropping them.');
    }
};
