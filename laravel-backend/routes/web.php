<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

// Web middleware enforces sessions and CSRF even when Origin is missing.
Route::prefix('api/v1/auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::middleware(['auth:sanctum', 'portal.role'])->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });
});
