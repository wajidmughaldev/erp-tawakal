<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IdCard;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class IdCardController extends Controller
{
    public function index(Request $request)
    {
        $cards = IdCard::with('employee')->orderBy('created_at', 'desc')->paginate(15);
        return response()->json($cards);
    }

    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'expiry_date' => 'required|date|after:today',
        ]);

        // Check if card already exists
        $existing = IdCard::where('employee_id', $request->employee_id)->first();
        if ($existing) {
            return response()->json([
                'message' => 'ID card already exists for this employee. Use reissue or renew.',
                'data' => $existing
            ], 409);
        }

        $cardNumber = 'CARD-' . strtoupper(Str::random(6));
        $qrHash = hash('sha256', $cardNumber . time());

        $idCard = IdCard::create([
            'employee_id' => $request->employee_id,
            'card_number' => $cardNumber,
            'qr_code_hash' => $qrHash,
            'issued_date' => now(),
            'expiry_date' => $request->expiry_date,
            'status' => 'active',
            'printed_by' => $request->input('printed_by', 'Admin'),
        ]);

        return response()->json([
            'message' => 'ID card generated successfully',
            'data' => $idCard->load('employee')
        ], 201);
    }

    public function show($id)
    {
        $card = IdCard::with('employee')->findOrFail($id);
        return response()->json($card);
    }

    public function verify(Request $request)
    {
        $request->validate([
            'card_number' => 'required|string',
        ]);

        $card = IdCard::with('employee')->where('card_number', $request->card_number)->first();

        if (!$card) {
            return response()->json([
                'valid' => false,
                'message' => 'Invalid ID Card Number. Not found in database.'
            ], 404);
        }

        // Increment verification stats
        $card->increment('verification_count');
        $card->update(['last_verified_at' => now()]);

        $isExpired = $card->expiry_date->isPast();

        return response()->json([
            'valid' => !$isExpired && $card->status === 'active',
            'status' => $card->status,
            'is_expired' => $isExpired,
            'card' => $card,
            'employee' => $card->employee,
            'message' => $isExpired ? 'Card has expired.' : 'Card is active and authentic.'
        ]);
    }
}
