<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Registration links no longer need the candidate's details up front.
        DB::statement('ALTER TABLE registration_invites MODIFY candidate_name TEXT NULL');
        DB::statement('ALTER TABLE registration_invites MODIFY designation VARCHAR(255) NULL');
        DB::statement('ALTER TABLE registration_invites MODIFY department VARCHAR(255) NULL');

        Schema::create('candidate_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_request_id')->constrained('candidate_requests')->restrictOnDelete();
            $table->text('name');
            $table->string('type', 100);
            $table->text('path');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Preserve candidate documents; restore a reviewed backup instead of dropping them.');
    }
};
