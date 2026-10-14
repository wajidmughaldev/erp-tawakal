<?php

use App\Http\Controllers\DeferredEndpointController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public entry points remain unavailable until their security checkpoints.
    Route::post('registration-invites/validate', DeferredEndpointController::class);
    Route::post('employee-requests', DeferredEndpointController::class);
    Route::post('verify-card', DeferredEndpointController::class);
    Route::middleware(['auth:sanctum', 'portal.role'])->group(function () {
        Route::get('employees', DeferredEndpointController::class);
        Route::post('employees', DeferredEndpointController::class);
        Route::match(['get', 'put', 'patch', 'delete'], 'employees/{id}', DeferredEndpointController::class);
        Route::get('id-cards', DeferredEndpointController::class);
        Route::post('id-cards', DeferredEndpointController::class);
        Route::get('id-cards/{id}', DeferredEndpointController::class);
    });
});
