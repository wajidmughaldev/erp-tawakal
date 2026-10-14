<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $app = parent::createApplication();
        // Guard before RefreshDatabase/DatabaseTruncation can migrate or destroy data.
        if (config('database.default') !== 'mysql' || ! str_ends_with(config('database.connections.mysql.database'), '_test')) {
            throw new \RuntimeException('Tests require a dedicated MySQL database ending in _test.');
        }

        return $app;
    }
}
