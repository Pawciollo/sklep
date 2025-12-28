<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query()
    ->with(['category', 'subcategory'])
    ->withSum('orderItems as sold_count', 'quantity')
    ->where('active', true);


        // filtr kategorii (slug)
        if ($request->filled('category')) {
            $slug = (string) $request->get('category');
            $query->whereHas('category', function ($q) use ($slug) {
                $q->where('slug', $slug)->where('active', true);
            });
        }

        // filtr podkategorii (slug)
        if ($request->filled('subcategory')) {
        $subSlug = (string) $request->get('subcategory');
        $query->whereHas('subcategory', function ($q) use ($subSlug) {
            $q->where('slug', $subSlug)->where('active', true);
        });
        }
        else
        {
            // pokaż produkty bez subkategorii LUB z aktywną subkategorią
            $query->where(function ($q) {
                $q->whereNull('subcategory_id')
                ->orWhereHas('subcategory', function ($sub) {
                    $sub->where('active', true);
                });
            });
        }

        $sort = $request->get('sort');

        if ($sort === 'popular') {
            $query->orderByDesc('sold_count');
        } elseif ($sort === 'price_asc') {
            $query->orderBy('price');
        } elseif ($sort === 'price_desc') {
            $query->orderByDesc('price');
        }

        // search po nazwie
        if ($request->filled('search')) {
            $search = (string) $request->get('search');
            $query->where('name', 'LIKE', "%{$search}%");
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function show(Product $product)
    {
        $product->load('category');

        return response()->json($product);
    }
}
