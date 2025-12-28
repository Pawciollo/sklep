<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained()
                  ->nullOnDelete();

            $table->string('session_id')->nullable();

            $table->string('status')->default('pending'); // pending, paid, shipped, completed, cancelled

            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('customer_phone');

            $table->string('address_line1');
            $table->string('address_line2')->nullable();
            $table->string('city');
            $table->string('postal_code');
            $table->string('country')->default('Poland');

            $table->unsignedInteger('total_amount'); // suma całego zamówienia w groszach

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
