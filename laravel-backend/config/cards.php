<?php

return [
    // Activation requires the operator's approved product policy; tests override configuration only.
    'validity_policy' => env('CARD_VALIDITY_POLICY', 'unconfigured'),

    // Brand colour printed on every ID card until an administrator picks another one. Same as the portal sidebar.
    'default_color' => '#092a4a',
];
