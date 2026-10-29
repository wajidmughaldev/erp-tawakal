<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\IdCardResource;
use App\Models\CandidateRequest;
use App\Models\Employee;
use App\Models\IdCard;
use App\Models\RegistrationInvite;
use App\Models\User;
use Illuminate\Http\Request;

class SummaryController extends Controller
{
    public function dashboard(Request $request)
    {
        $cards = fn ($status, $direction) => IdCard::with('employee')->displayStatus($status)->orderBy('expiry_date', $direction)->orderBy('id')->limit(10)->get()->map(function ($card) use ($request) {
            $data = (new IdCardResource($card))->resolve($request);
            unset($data['verificationToken']);

            return $data;
        });
        $expiring = $cards('expiring_soon', 'asc');
        $expired = $cards('expired', 'desc');

        return response()->json(['data' => ['totalEmployees' => Employee::count(), 'activeEmployees' => Employee::where('status', 'active')->count(), 'resignedEmployees' => Employee::where('status', 'resigned')->count(), 'activeCards' => IdCard::displayStatus('active')->count(), 'revokedCards' => IdCard::displayStatus('revoked')->count(), 'expiringCards' => IdCard::displayStatus('expiring_soon')->count(), 'expiredCards' => IdCard::displayStatus('expired')->count(), 'managerCount' => User::where('role', 'manager')->where('is_active', true)->count(), 'pendingRequests' => CandidateRequest::where('status', 'pending')->count(), 'expiring' => $expiring, 'expired' => $expired]])->header('Cache-Control', 'no-store');
    }

    public function requests()
    {
        return response()->json(['data' => ['total' => CandidateRequest::count(), 'pending' => CandidateRequest::where('status', 'pending')->count(), 'approved' => CandidateRequest::where('status', 'approved')->count(), 'rejected' => CandidateRequest::where('status', 'rejected')->count(), 'fieldRoles' => CandidateRequest::whereIn('role_category', ['motorcycle', 'van'])->count(), 'activeInvitations' => RegistrationInvite::whereNull('used_at')->where('expires_at', '>', now())->count()]])->header('Cache-Control','no-store');
    }
}
