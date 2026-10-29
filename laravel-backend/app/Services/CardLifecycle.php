<?php

namespace App\Services;

use App\Models\CardLifecycleEvent;
use App\Models\Employee;
use App\Models\IdCard;
use App\Models\User;
use App\Support\CardToken;
use App\Support\CardValidity;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class CardLifecycle
{
    public function issue(string $employeeId, ?int $years, User $actor): IdCard
    {
        return $this->transaction(function () use ($employeeId, $years, $actor) {
            $employee = Employee::withTrashed()->whereKey($employeeId)->lockForUpdate()->firstOrFail();
            $this->eligibleEmployee($employee);
            abort_if(IdCard::withTrashed()->where('current_employee_id', $employee->id)->exists(), 409, 'An existing current credential requires renewal or reissue.');
            $term = CardValidity::calculate(CardValidity::today(), $years);
            $card = $this->createCredential($employee, $term['expiry'], $term['policy'], $term['years'], $actor);
            $this->event($card, 'issuance', $actor, null, null, $card, null, $card->expiry_date);

            return $card;
        });
    }

    public function preview(IdCard $card, string $option, ?int $years): array
    {
        $term = $this->renewalTerm($card, $years);

        return ['currentExpiry' => $card->expiry_date->toDateString(), 'proposedExpiry' => $term['expiry']->toDateString(), 'option' => $option, 'validityYears' => $years, 'policy' => $term['policy']];
    }

    private function renewalTerm(IdCard $card, ?int $years): array
    {
        $this->eligibleEmployee($card->employee);
        $this->eligibleCard($card);
        $base = $card->expiry_date->greaterThan(CardValidity::today()) ? $card->expiry_date : CardValidity::today();

        return CardValidity::calculate($base, $years ?? $card->validity_years);
    }

    public function renew(IdCard $selected, string $option, ?int $years, User $actor, string $operationKey, ?string $ifMatch): IdCard
    {
        return $this->transaction(function () use ($selected, $option, $years, $actor, $operationKey, $ifMatch) {
            [$employee,$card] = $this->lock($selected);
            $keyDigest = hash('sha256', $operationKey);
            $previous = DB::table('card_renewal_operations')->where('key_digest', $keyDigest)->first();
            if ($previous) {
                abort_unless($previous->original_revision !== null && $ifMatch === '"card-'.$card->id.'-v'.$previous->original_revision.'"' && $previous->administrator_id === $actor->id && $previous->card_id === $card->id && $previous->option === $option && $previous->requested_years === $years, 409, 'This renewal identifier belongs to a different operation or cannot be safely reconciled.');

                return IdCard::findOrFail($previous->result_card_id);
            }
            abort_if($ifMatch === null || $ifMatch === '', 428, 'Reload the card to obtain its revision before renewing.');
            abort_unless($ifMatch === $card->etag(), 412, 'The card changed. Reload and review the latest expiry before a new renewal.');
            $card->setRelation('employee', $employee);
            $term = $this->renewalTerm($card, $years);
            $originalRevision = $card->revision;
            $previousExpiry = $card->expiry_date;
            if ($option === 'existing') {
                $card->expiry_date = $term['expiry'];
                $card->validity_policy = $term['policy'];
                $card->validity_years = $term['years'];
                $card->revision++;
                $card->save();
                $this->event($card, 'renewal', $actor, null, $card, $card, $previousExpiry, $card->expiry_date);

                $this->recordRenewal($keyDigest, $actor, $card, $option, $years, $card, $originalRevision);

                return $card;
            }
            $this->retire($card, 'replaced');
            $new = $this->createCredential($employee, $term['expiry'], $term['policy'], $term['years'], $actor);
            $this->event($card, 'renewal', $actor, null, $card, $new, $previousExpiry, $new->expiry_date);
            $this->event($card, 'replacement', $actor, null, $card, $new, $previousExpiry, $new->expiry_date);

            $this->recordRenewal($keyDigest, $actor, $card, $option, $years, $new, $originalRevision);

            return $new;
        });
    }

    public function reissue(IdCard $selected, string $reason, User $actor): IdCard
    {
        return $this->transaction(function () use ($selected, $reason, $actor) {
            [$employee,$card] = $this->lock($selected);
            $this->eligibleEmployee($employee);
            $this->eligibleCard($card);
            abort_if($card->expiry_date->lessThan(CardValidity::today()), 409, 'Expired credentials require renewal before reissue.');
            $this->retire($card, 'replaced');
            // Reissue preserves the term, even if the global policy was subsequently disabled.
            $new = $this->createCredential($employee, $card->expiry_date, $card->validity_policy, $card->validity_years, $actor);
            $this->event($card, 'reissue', $actor, $reason, $card, $new, $card->expiry_date, $new->expiry_date);

            return $new;
        });
    }

    public function deactivate(IdCard $selected, string $reason, User $actor): IdCard
    {
        return $this->transaction(function () use ($selected, $reason, $actor) {
            [, $card] = $this->lock($selected);
            $this->eligibleCard($card);
            $this->retire($card, 'revoked');
            $this->event($card, 'deactivation', $actor, $reason, $card, null, $card->expiry_date, null);

            return $card;
        });
    }

    private function recordRenewal(string $digest, User $actor, IdCard $card, string $option, ?int $years, IdCard $result, int $originalRevision): void
    {
        DB::table('card_renewal_operations')->insert(['key_digest' => $digest, 'administrator_id' => $actor->id, 'card_id' => $card->id, 'option' => $option, 'requested_years' => $years, 'original_revision' => $originalRevision, 'result_card_id' => $result->id, 'created_at' => now()]);
    }

    private function lock(IdCard $selected): array
    {
        $employee = Employee::withTrashed()->whereKey($selected->employee_id)->lockForUpdate()->firstOrFail();
        $card = IdCard::whereKey($selected->id)->lockForUpdate()->firstOrFail();

        return [$employee, $card];
    }

    private function eligibleEmployee(Employee $employee): void
    {
        abort_unless(! $employee->trashed() && in_array($employee->status, Employee::WORKING_STATUSES, true), 409, 'The employee must be active or transferred, and not deleted.');
    }

    private function eligibleCard(IdCard $card): void
    {
        abort_unless($card->isCurrent(), 409, 'Only a current credential is eligible. Historical cards without a credential require explicit new issuance.');
    }

    private function retire(IdCard $card, string $status): void
    {
        $card->status = $status;
        $card->current_employee_id = null;
        $card->revision++;
        $card->save();
    }

    private function createCredential(Employee $employee, $expiry, ?string $policy, ?int $years, User $actor): IdCard
    {
        $token = CardToken::generate();
        $card = IdCard::create(['revision' => 1, 'employee_id' => $employee->id, 'current_employee_id' => $employee->id, 'card_number' => null, 'qr_code_hash' => null, 'verification_token_digest' => CardToken::digest($token), 'verification_token' => $token, 'issued_date' => CardValidity::today(), 'expiry_date' => $expiry, 'status' => 'active', 'printed_by' => $actor->name, 'issued_by' => $actor->id, 'validity_policy' => $policy, 'validity_years' => $years]);
        $base = 'CARD-'.$card->issued_date->format('Y').'-'.str_pad((string) $card->id, 6, '0', STR_PAD_LEFT);
        $number = $base;
        $suffix = 0;
        while (IdCard::withTrashed()->where('card_number', $number)->exists()) {
            $number = $base.'-'.(++$suffix);
        }
        $card->card_number = $number;
        $card->save();

        return $card;
    }

    private function event(IdCard $card, string $operation, User $actor, ?string $reason, ?IdCard $previous, ?IdCard $new, $previousExpiry, $newExpiry): void
    {
        CardLifecycleEvent::create(['card_id' => $card->id, 'employee_id' => $card->employee_id, 'operation' => $operation, 'administrator_id' => $actor->id, 'occurred_at' => now(), 'reason' => $reason, 'previous_card_id' => $previous?->id, 'new_card_id' => $new?->id, 'previous_expiry' => $previousExpiry, 'new_expiry' => $newExpiry]);
    }

    private function transaction(callable $operation): IdCard
    {
        try {
            return DB::transaction($operation);
        } catch (QueryException $error) {
            if (($error->errorInfo[1] ?? null) === 1062) {
                abort(409, 'A conflicting card credential already exists.');
            }
            throw $error;
        }
    }
}
