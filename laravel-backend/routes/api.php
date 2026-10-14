<?php

use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\DeferredEndpointController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public entry points remain unavailable until their security checkpoints.
    Route::post('registration-invites/validate', DeferredEndpointController::class);
    Route::post('employee-requests', DeferredEndpointController::class);
    Route::post('verify-card', DeferredEndpointController::class);
    Route::middleware(['auth:sanctum', 'portal.role'])->group(function () {
        Route::apiResource('employees', EmployeeController::class);
        Route::get('employees/{employee}/documents', [EmployeeController::class, 'documents']);
        Route::get('employees/{employee}/photo', [EmployeeController::class, 'photo'])->name('employees.photo');
        Route::get('documents/{document}/download', [EmployeeController::class, 'download']);
        Route::post('employees/{employee}/actions', DeferredEndpointController::class);
        Route::get('id-cards', DeferredEndpointController::class);
        Route::post('id-cards', DeferredEndpointController::class);
        Route::get('id-cards/{id}', DeferredEndpointController::class);
    });
});
