<?php

use App\Http\Controllers\Api\CandidateRequestController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\IdCardController;
use App\Http\Controllers\Api\RegistrationInviteController;
use App\Http\Controllers\DeferredEndpointController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public token workflows keep normal Sanctum stateful CSRF protection.
    Route::post('registration-invites/validate', [RegistrationInviteController::class, 'validateToken'])->middleware('throttle:invite-validation');
    Route::post('employee-requests', [CandidateRequestController::class, 'store'])->middleware('throttle:candidate-submission');
    Route::post('verify-card', [IdCardController::class, 'verify'])->middleware('throttle:card-verification');
    Route::middleware(['auth:sanctum', 'portal.role'])->group(function () {
        Route::get('registration-invites', [RegistrationInviteController::class, 'index']);
        Route::post('registration-invites', [RegistrationInviteController::class, 'store']);
        Route::get('employee-requests', [CandidateRequestController::class, 'index']);
        Route::get('employee-requests/{candidateRequest}', [CandidateRequestController::class, 'show']);
        Route::get('employee-requests/{candidateRequest}/photo', [CandidateRequestController::class, 'photo'])->name('candidate-requests.photo');
        Route::post('employee-requests/{candidateRequest}/approve', [CandidateRequestController::class, 'approve']);
        Route::post('employee-requests/{candidateRequest}/reject', [CandidateRequestController::class, 'reject']);
        Route::apiResource('employees', EmployeeController::class);
        Route::get('employees/{employee}/documents', [EmployeeController::class, 'documents']);
        Route::get('employees/{employee}/photo', [EmployeeController::class, 'photo'])->name('employees.photo');
        Route::get('documents/{document}/download', [EmployeeController::class, 'download']);
        Route::post('employees/{employee}/actions', DeferredEndpointController::class);
        Route::get('id-cards', [IdCardController::class, 'index']);
        Route::post('id-cards', [IdCardController::class, 'store']);
        Route::get('id-cards/{idCard}', [IdCardController::class, 'show']);
        Route::post('id-cards/{idCard}/renew', [IdCardController::class, 'renew']);
        Route::post('id-cards/{idCard}/reissue', [IdCardController::class, 'reissue']);
        Route::post('id-cards/{idCard}/deactivate', [IdCardController::class, 'deactivate']);
    });
});
