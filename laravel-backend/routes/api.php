<?php

use App\Http\Controllers\Api\CandidateRequestController;
use App\Http\Controllers\Api\CardSettingsController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\EmployeeDocumentController;
use App\Http\Controllers\Api\EmploymentActionController;
use App\Http\Controllers\Api\IdCardController;
use App\Http\Controllers\Api\ManagerController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\RegistrationInviteController;
use App\Http\Controllers\Api\SummaryController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public token workflows keep normal Sanctum stateful CSRF protection.
    Route::post('registration-invites/validate', [RegistrationInviteController::class, 'validateToken'])->middleware('throttle:invite-validation');
    Route::post('registration-invites/check-cnic', [CandidateRequestController::class, 'checkCnic'])->middleware('throttle:cnic-check');
    Route::post('employee-requests', [CandidateRequestController::class, 'store'])->middleware('throttle:candidate-submission');
    Route::post('verify-card', [IdCardController::class, 'verify'])->middleware('throttle:card-verification');
    Route::get('verify-card/photo/{employee}', [IdCardController::class, 'verificationPhoto'])->middleware(['signed', 'throttle:card-verification'])->name('card-verification.photo');
    Route::middleware(['auth:sanctum', 'portal.role'])->group(function () {
        Route::middleware('portal.role:superadmin')->group(function () {
            Route::apiResource('managers', ManagerController::class)->only(['index', 'show', 'store', 'update'])->parameters(['managers' => 'manager']);
        });
        Route::get('registration-invites',[RegistrationInviteController::class, 'index']);
        Route::post('registration-invites', [RegistrationInviteController::class, 'store']);
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/read-all', [NotificationController::class, 'readAll']);
        Route::get('dashboard/summary', [SummaryController::class, 'dashboard']);
        Route::get('employee-requests/summary', [SummaryController::class, 'requests']);
        Route::get('id-cards/policy', [IdCardController::class, 'policy']);
        Route::get('id-cards/eligible-employees', [IdCardController::class, 'eligibleEmployees']);
        Route::get('id-cards/settings', [CardSettingsController::class, 'show']);
        Route::middleware('portal.role:superadmin')->group(function () {
            Route::put('id-cards/settings', [CardSettingsController::class, 'update']);
            Route::delete('id-cards/settings', [CardSettingsController::class, 'reset']);
        });
        Route::get('employee-requests', [CandidateRequestController::class, 'index']);
        Route::get('employee-requests/{candidateRequest}', [CandidateRequestController::class, 'show']);
        Route::get('employee-requests/{candidateRequest}/photo', [CandidateRequestController::class, 'photo'])->name('candidate-requests.photo');
        Route::get('candidate-documents/{candidateDocument}/download', [CandidateRequestController::class, 'downloadDocument']);
        Route::post('employees/check-cnic', [EmployeeController::class, 'checkCnic']);
        Route::post('employee-requests/{candidateRequest}/approve', [CandidateRequestController::class, 'approve']);
        Route::post('employee-requests/{candidateRequest}/reject', [CandidateRequestController::class, 'reject']);
        Route::apiResource('employees', EmployeeController::class);
        Route::get('employees/{employee}/documents', [EmployeeController::class, 'documents']);
        Route::get('employees/{employee}/photo', [EmployeeController::class, 'photo'])->name('employees.photo');
        Route::post('employees/{employee}/documents', [EmployeeDocumentController::class, 'store']);
        Route::get('documents/{document}/download', [EmployeeController::class, 'download']);
        Route::delete('documents/{document}', [EmployeeDocumentController::class, 'destroy']);
        Route::post('employees/{employee}/actions', [EmploymentActionController::class, 'store']);
        Route::get('id-cards', [IdCardController::class, 'index']);
        Route::post('id-cards', [IdCardController::class, 'store']);
        Route::get('id-cards/{idCard}', [IdCardController::class, 'show']);
        Route::post('id-cards/{idCard}/renew', [IdCardController::class, 'renew']);
        Route::get('id-cards/{idCard}/renewal-preview', [IdCardController::class, 'renewalPreview']);
        Route::post('id-cards/{idCard}/reissue', [IdCardController::class, 'reissue']);
        Route::post('id-cards/{idCard}/deactivate', [IdCardController::class, 'deactivate']);
    });
});
