<?php

/*
 * Entry point for /api, /sanctum and /up (see .htaccess).
 * The Laravel application lives OUTSIDE the web root. Either of these layouts works:
 *   zip upload : .../domains/tawakalent.com/ems-laravel/
 *   git deploy : .../domains/tawakalent.com/ems-repo/laravel-backend/
 * (the folder next to "public_html"). Change $laravel below if you put Laravel somewhere else.
 */

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$home = dirname(__DIR__, 2);
$laravel = is_dir($home.'/ems-laravel') ? $home.'/ems-laravel' : $home.'/ems-repo/laravel-backend';

if (file_exists($maintenance = $laravel.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $laravel.'/vendor/autoload.php';

(require_once $laravel.'/bootstrap/app.php')->handleRequest(Request::capture());
