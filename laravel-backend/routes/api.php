<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\IdCardController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::prefix('v1')->group(function () {
    // Employees
    Route::apiResource('employees', EmployeeController::class);

    // ID Cards
    Route::get('id-cards', [IdCardController::class, 'index']);
    Route::post('id-cards', [IdCardController::class, 'store']);
    Route::get('id-cards/{id}', [IdCardController::class, 'show']);

    // Verification endpoint
    Route::post('verify-card', [IdCardController::class, 'verify']);
});
