<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_brandings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('business_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('display_name')->nullable();
            $table->string('primary_color', 7)->default('#1c1917');
            $table->string('secondary_color', 7)->default('#57534e');
            $table->string('accent_color', 7)->default('#0f766e');
            $table->string('logo_path')->nullable();
            $table->string('logo_disk')->nullable();
            $table->string('logo_mime', 64)->nullable();
            $table->timestamps();
        });

        Schema::table('websites', function (Blueprint $table): void {
            $table->string('favicon_path')->nullable()->after('is_active');
            $table->string('logo_path')->nullable()->after('favicon_path');
            $table->string('brand_disk')->nullable()->after('logo_path');
            $table->string('favicon_source_url')->nullable()->after('brand_disk');
            $table->string('logo_source_url')->nullable()->after('favicon_source_url');
            $table->timestamp('logo_fetched_at')->nullable()->after('logo_source_url');
        });
    }

    public function down(): void
    {
        Schema::table('websites', function (Blueprint $table): void {
            $table->dropColumn([
                'favicon_path',
                'logo_path',
                'brand_disk',
                'favicon_source_url',
                'logo_source_url',
                'logo_fetched_at',
            ]);
        });

        Schema::dropIfExists('business_brandings');
    }
};
