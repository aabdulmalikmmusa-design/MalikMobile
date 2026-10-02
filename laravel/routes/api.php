<?php

use App\Http\Controllers\Api\HabitController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group.
|
*/

// This will automatically handle /api/habits routes (GET, POST, PUT, DELETE)
Route::apiResource('habits', HabitController::class);
