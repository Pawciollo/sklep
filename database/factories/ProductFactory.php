<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use App\Models\Category;

class ProductFactory extends Factory
{
    public function definition(): array
    {
        $name = ucfirst($this->faker->unique()->words(3, true));
        return [
            'category_id' => Category::factory(),
            'name'        => $name,
            'slug'        => Str::slug($name) . '-' . $this->faker->unique()->numberBetween(1000,9999),
            'description' => $this->faker->paragraph(),
            'price'       => $this->faker->numberBetween(2999, 299999),
            'stock'       => $this->faker->numberBetween(0, 150),
            'images'      => [$this->faker->imageUrl(), $this->faker->imageUrl()],
            'active'      => true,
        ];
    }
}
