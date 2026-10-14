<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class DeferredEndpointController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json(['message' => 'This endpoint is reserved for a later backend checkpoint.'], 503);
    }
}
