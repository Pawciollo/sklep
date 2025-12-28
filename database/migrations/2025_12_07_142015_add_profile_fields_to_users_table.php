<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->string('phone')->nullable()->after('email');
        $table->string('address_line1')->nullable()->after('phone');
        $table->string('address_line2')->nullable()->after('address_line1');
        $table->string('city')->nullable()->after('address_line2');
        $table->string('postal_code')->nullable()->after('city');
        $table->string('country')->nullable()->after('postal_code');
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->dropColumn([
            'phone',
            'address_line1',
            'address_line2',
            'city',
            'postal_code',
            'country',
        ]);
    });
}
};
