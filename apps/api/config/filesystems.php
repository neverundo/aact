<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        /*
        | Encrypted referrer documents (portal uploads).
        | Staging/prod: PRIVATE_DOCUMENTS_DRIVER=s3 with AWS_* from deploy secrets
        | / .env.staging and PRIVATE_DOCUMENTS_PREFIX (default referrers-docs/).
        | Local/tests: private app storage. Objects are application-encrypted;
        | downloads decrypt in the API.
        */
        'private_documents' => (static function (): array {
            $driver = strtolower(trim((string) env('PRIVATE_DOCUMENTS_DRIVER', 'local')));
            if ($driver === 's3') {
                return [
                    'driver' => 's3',
                    'key' => env('AWS_ACCESS_KEY_ID'),
                    'secret' => env('AWS_SECRET_ACCESS_KEY'),
                    'region' => env('AWS_DEFAULT_REGION'),
                    'bucket' => env('AWS_BUCKET'),
                    'url' => env('AWS_URL'),
                    'endpoint' => ($endpoint = env('AWS_ENDPOINT'))
                        ? rtrim((string) $endpoint, '/')
                        : null,
                    'use_path_style_endpoint' => filter_var(
                        env('AWS_USE_PATH_STYLE_ENDPOINT', 'false'),
                        FILTER_VALIDATE_BOOLEAN
                    ),
                    'root' => trim((string) env('PRIVATE_DOCUMENTS_PREFIX', 'referrers-docs'), '/'),
                    'visibility' => 'private',
                    'throw' => true,
                    'report' => true,
                ];
            }

            if ($driver !== 'local' && $driver !== '') {
                throw new \InvalidArgumentException(
                    'PRIVATE_DOCUMENTS_DRIVER must be "local" or "s3", got: '.$driver
                );
            }

            return [
                'driver' => 'local',
                'root' => storage_path('app/private/documents'),
                'visibility' => 'private',
                'throw' => true,
                'report' => false,
            ];
        })(),

        'branding_assets' => [
            'driver' => 'local',
            'root' => storage_path('app/branding'),
            'visibility' => 'private',
            'throw' => true,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
