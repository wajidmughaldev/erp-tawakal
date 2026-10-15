<?php

return [
    // Activation requires the operator's approved product policy; tests override configuration only.
    'validity_policy' => env('CARD_VALIDITY_POLICY', 'unconfigured'),
];
