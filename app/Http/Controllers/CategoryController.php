<?php

namespace App\Http\Controllers;

use App\Models\Category;

class CategoryController extends Controller
{
    public function index()
    {
        return Category::with(['subcategories' => function ($query) {
                $query->where('active', true)->orderBy('name');
            }])
            ->where('active', true)
            ->orderBy('name')
            ->get();
    }

    public function show(Category $category)
    {
        return $category->loadMissing('products');
    }
}
