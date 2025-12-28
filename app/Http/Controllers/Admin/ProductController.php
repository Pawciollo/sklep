<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\Subcategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ProductController extends Controller
{
    private function ensureAdmin(Request $request): void
    {
        $user = $request->user();

        if (!$user || !$user->is_admin) {
            abort(403, 'Tylko admin ma dostęp do tej strony.');
        }
    }

    public function index(Request $request)
    {
        $this->ensureAdmin($request);

        // ✅ bierzemy "surowe" parametry - jeśli brak w URL => null
        $sortParam = $request->query('sort');
        $dirParam  = $request->query('dir');

        // query ma mieć domyślne sortowanie, ale UI ma wiedzieć kiedy jest reset
        $sort = is_string($sortParam) ? $sortParam : 'created_at';
        $dir  = strtolower((string) $dirParam) === 'asc' ? 'asc' : 'desc';

        $allowed = ['id', 'name', 'price', 'stock', 'active', 'created_at', 'category', 'subcategory'];
        if (!in_array($sort, $allowed, true)) {
            $sort = 'created_at';
        }

        // ✅ FILTRY
        $filters = [
            'category_id'    => $request->query('category_id') ? (int) $request->query('category_id') : null,
            'subcategory_id' => $request->query('subcategory_id') ? (int) $request->query('subcategory_id') : null,
        ];

        $query = Product::query()->with(['category', 'subcategory']);

        if ($filters['category_id']) {
            $query->where('products.category_id', $filters['category_id']);
        }
        if ($filters['subcategory_id']) {
            $query->where('products.subcategory_id', $filters['subcategory_id']);
        }

        // sortowanie jak było
        if ($sort === 'category') {
            $query->leftJoin('categories as c', 'products.category_id', '=', 'c.id')
                ->select('products.*')
                ->orderBy('c.name', $dir);
        } elseif ($sort === 'subcategory') {
            $query->leftJoin('subcategories as s', 'products.subcategory_id', '=', 's.id')
                ->select('products.*')
                ->orderBy('s.name', $dir);
        } else {
            $columnMap = [
                'id'         => 'products.id',
                'name'       => 'products.name',
                'price'      => 'products.price',
                'stock'      => 'products.stock',
                'active'     => 'products.active',
                'created_at' => 'products.created_at',
            ];

            $query->orderBy($columnMap[$sort] ?? 'products.created_at', $dir);
        }

        $products = $query->get();

        $categories = Category::orderBy('name')->get(['id', 'name', 'slug']);
        $subcategories = Subcategory::orderBy('name')->get(['id', 'category_id', 'name', 'slug', 'active']);

        return Inertia::render('admin/products/Index', [
            'products'      => $products,
            'categories'    => $categories,
            'subcategories' => $subcategories,

            // ✅ UWAGA: tu celowo przekazujemy TYLKO jeśli było w URL
            'sort'          => $sortParam ?: null,
            'dir'           => $dirParam ?: null,

            'filters'       => $filters,
        ]);
    }

    public function store(Request $request)
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'category_id'     => 'required|exists:categories,id',
            'subcategory_id'  => 'nullable|exists:subcategories,id',
            'name'            => 'required|string|max:255',
            'description'     => 'nullable|string',
            'price'           => 'required|integer|min:0',
            'stock'           => 'required|integer|min:0',

            'images'          => 'nullable|array',
            'images.*'        => 'file|image|max:5120',

            'active'          => 'required|boolean',
        ]);

        if (!empty($data['subcategory_id'])) {
            $sub = Subcategory::find($data['subcategory_id']);
            if (!$sub || $sub->category_id !== (int) $data['category_id']) {
                return redirect()->back()->with('error', 'Podkategoria nie pasuje do wybranej kategorii.');
            }
        }

        $data['slug'] = $this->uniqueSlug($data['name']);

        $paths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $paths[] = $file->store('products', 'public');
            }
        }
        $data['images'] = $paths;

        Product::create($data);

        return redirect()->back()->with('success', 'Produkt dodany.');
    }

    public function update(Request $request, Product $product)
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'category_id'     => 'required|exists:categories,id',
            'subcategory_id'  => 'nullable|exists:subcategories,id',
            'name'            => 'required|string|max:255',
            'description'     => 'nullable|string',
            'price'           => 'required|integer|min:0',
            'stock'           => 'required|integer|min:0',

            'images'          => 'nullable|array',
            'images.*'        => 'file|image|max:5120',

            'existing_images'    => 'nullable|array',
            'existing_images.*'  => 'string',

            'active'          => 'required|boolean',
        ]);

        if (!empty($data['subcategory_id'])) {
            $sub = Subcategory::find($data['subcategory_id']);
            if (!$sub || $sub->category_id !== (int) $data['category_id']) {
                return redirect()->back()->with('error', 'Podkategoria nie pasuje do wybranej kategorii.');
            }
        }

        if ($data['name'] !== $product->name) {
            $data['slug'] = $this->uniqueSlug($data['name'], $product->id);
        }

        $old = is_array($product->images) ? $product->images : [];

        $keep = $request->input('existing_images', $old);
        if (!is_array($keep)) {
            $keep = $old;
        }

        $removed = array_values(array_diff($old, $keep));
        foreach ($removed as $path) {
            if (is_string($path) && strlen($path) > 0) {
                Storage::disk('public')->delete($path);
            }
        }

        $newPaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $newPaths[] = $file->store('products', 'public');
            }
        }

        $data['images'] = array_values(array_merge($keep, $newPaths));

        unset($data['existing_images']);

        $product->update($data);

        return redirect()->back()->with('success', 'Produkt zaktualizowany.');
    }

    public function destroy(Request $request, Product $product)
    {
        $this->ensureAdmin($request);

        $isUsedInOrders = \Illuminate\Support\Facades\DB::table('order_items')
            ->where('product_id', $product->id)
            ->exists();

        if ($isUsedInOrders) {
            // produkt jest w zamówieniach: nie usuwamy twardo, tylko "ukrywamy" i soft-delete
            $product->update(['active' => false]);
            $product->delete();

            return redirect()->back()->with(
                'success',
                'Produkt został usunięty (archiwalnie). Ponieważ występuje w zamówieniach, został przeniesiony do usuniętych i wyłączony.'
            );
        }

        // jeśli nie jest w zamówieniach, również robimy soft delete (zniknie ze sklepu/panelu)
        $product->delete();

        return redirect()->back()->with('success', 'Produkt usunięty.');
    }

    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 2;

        while (
            Product::where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $base . '-' . $i;
            $i++;
        }

        return $slug;
    }
}
