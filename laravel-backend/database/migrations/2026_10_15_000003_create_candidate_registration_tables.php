<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registration_invites', function (Blueprint $table) {
            $table->id();
            $table->text('candidate_name');
            $table->string('designation');
            $table->string('department');
            $table->enum('role_category', ['office', 'motorcycle', 'van'])->nullable();
            $table->char('token_digest', 64)->unique();
            $table->text('token');
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->dateTime('expires_at', 6)->index();
            $table->dateTime('used_at', 6)->nullable();
            $table->timestamps(6);
        });
        Schema::create('candidate_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('registration_invite_id')->unique()->constrained('registration_invites')->restrictOnDelete();
            $table->string('tracking_id')->nullable()->unique();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->index();
            $table->text('candidate_name');
            $table->enum('role_category', ['office', 'motorcycle', 'van'])->index();
            $table->longText('dossier');
            $table->char('cnic_lookup', 64)->index();
            $table->text('photo_path')->nullable();
            $table->foreignId('employee_id')->nullable()->unique()->constrained('employees')->restrictOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->dateTime('reviewed_at', 6)->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps(6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidate_requests');
        Schema::dropIfExists('registration_invites');
    }
};
