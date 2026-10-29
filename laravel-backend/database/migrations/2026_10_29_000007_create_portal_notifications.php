<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row per recipient, so each administrator keeps their own read state.
        Schema::create('portal_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('category', ['requests', 'cards', 'employees', 'accounts']);
            $table->enum('level', ['info', 'success', 'warning', 'danger'])->default('info');
            $table->string('title', 160);
            $table->text('message');
            $table->string('target_type', 20)->nullable();
            $table->string('target_id', 40)->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'read_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portal_notifications');
    }
};
