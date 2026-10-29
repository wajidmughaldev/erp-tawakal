<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The single brand colour used on every printed ID card. Anyone signed in can read it; only a superadmin changes it.
 */
class CardSettingsController extends Controller
{
    private const KEY = 'card_color';

    /** Card text is white, so the colour must give it at least this contrast (WCAG AA for normal text). */
    private const MIN_CONTRAST = 4.5;

    public function show(): JsonResponse
    {
        return $this->respond();
    }

    public function update(Request $request): JsonResponse
    {
        $input = $request->validate(['color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/']]);
        $color = strtolower($input['color']);
        if (self::contrastWithWhite($color) < self::MIN_CONTRAST) {
            throw ValidationException::withMessages(['color' => ['This colour is too light for the white text on the card. Choose a darker colour.']]);
        }
        DB::table('app_settings')->updateOrInsert(['key' => self::KEY], ['value' => $color, 'updated_at' => now()]);

        return $this->respond();
    }

    public function reset(): JsonResponse
    {
        DB::table('app_settings')->where('key', self::KEY)->delete();

        return $this->respond();
    }

    private function respond(): JsonResponse
    {
        $default = config('cards.default_color');
        $color = DB::table('app_settings')->where('key', self::KEY)->value('value') ?: $default;

        return response()->json(['data' => ['color' => $color, 'defaultColor' => $default, 'isDefault' => $color === $default]])->header('Cache-Control', 'no-store');
    }

    private static function contrastWithWhite(string $hex): float
    {
        $channels = array_map(function (string $part) {
            $value = hexdec($part) / 255;

            return $value <= 0.03928 ? $value / 12.92 : (($value + 0.055) / 1.055) ** 2.4;
        }, str_split(ltrim($hex, '#'), 2));
        $luminance = 0.2126 * $channels[0] + 0.7152 * $channels[1] + 0.0722 * $channels[2];

        return 1.05 / ($luminance + 0.05);
    }
}
