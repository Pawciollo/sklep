<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\Category;
use App\Models\Product;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $names = ['Hantle','Kettlebelle','Gumy oporowe','Maty','Suplementy'];

        $cats = collect($names)->map(fn($n) => Category::create([
            'name' => $n,
            'slug' => Str::slug($n),
        ]));

        foreach ($cats as $cat) {
            Product::factory(12)->create(['category_id' => $cat->id]);
        }
    }
}
