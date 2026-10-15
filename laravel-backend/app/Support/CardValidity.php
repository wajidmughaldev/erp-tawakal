<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

class CardValidity
{
    public static function today(): CarbonImmutable
    {
        return CarbonImmutable::today(config('app.timezone'));
    }

    public static function calculate(CarbonImmutable $from, ?int $years): array
    {
        $policy = config('cards.validity_policy');
        abort_unless(in_array($policy, ['eleven_months', 'selected_years'], true), 503, 'Card validity policy is unconfigured. Issuance and renewal require an approved policy.');
        if ($policy === 'eleven_months' && $years !== null) {
            throw ValidationException::withMessages(['validityYears' => ['The eleven-month policy conflicts with a year selection. Align the client with the approved policy.']]);
        }
        if ($policy === 'selected_years' && ! in_array($years, [1, 2], true)) {
            throw ValidationException::withMessages(['validityYears' => ['Select the approved one-year or two-year term.']]);
        }

        return ['expiry' => $policy === 'eleven_months' ? $from->addMonthsNoOverflow(11) : $from->addYearsNoOverflow($years), 'policy' => $policy, 'years' => $years];
    }
}
