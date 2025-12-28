<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Subcategory;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    private function ensureAdmin(Request $request): void
    {
        $user = $request->user();
        if (!$user || !$user->is_admin) {
            abort(403);
        }
    }

    public function index(Request $request): Response
    {
        $this->ensureAdmin($request);

        $categories = Category::with('subcategories')
            ->orderBy('name')
            ->get();

        // U Ciebie admin ma komponent TSX: resources/js/pages/admin/categories/Index.tsx
        return Inertia::render('admin/categories/Index', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:categories,slug'],
            'active' => ['required', 'boolean'],
        ]);

        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        Category::create($data);

        return redirect()->back()->with('success', 'Kategoria dodana.');
    }

    public function update(Request $request, Category $category)
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:categories,slug,' . $category->id],
            'active' => ['required', 'boolean'],
        ]);

        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        try {
            $category->update($data);
            return redirect()->back()->with('success', 'Kategoria zaktualizowana.');
        } catch (QueryException) {
            // jeśli masz powiązania i nie chcesz usuwać - w praktyce tu raczej nie wpadniesz
            return redirect()->back()->with('error', 'Nie udało się zaktualizować kategorii.');
        }
    }

    public function destroy(Request $request, Category $category)
    {
        $this->ensureAdmin($request);

        try {
            // jeśli nie chcesz usuwać, tylko dezaktywujemy
            if ($category->products()->exists()) {
                $category->update(['active' => false]);
                return redirect()->back()->with('success', 'Kategoria miała produkty – została zdezaktywowana.');
            }

            $category->delete();
            return redirect()->back()->with('success', 'Kategoria usunięta.');
        } catch (QueryException) {
            return redirect()->back()->with('error', 'Nie udało się usunąć kategorii.');
        }
    }

    public function storeSubcategory(Request $request)
    {
        $this->ensureAdmin($request);

        /**
         * Panel wysyła request na:
         * POST /admin/categories/{category}/subcategories
         * i w body są tylko np.:
         *  - name
         *  - active
         *
         * Dlatego category_id bierzemy z parametru routa {category}.
         * Wspieramy też wariant, gdy ktoś wysyła category_id w body.
         */
        $routeCategory = $request->route('category');
        $categoryId = $request->input('category_id');

        if (!$categoryId && $routeCategory) {
            $categoryId = $routeCategory instanceof Category
                ? $routeCategory->id
                : (int) $routeCategory;
        }

        if (!$categoryId || !Category::whereKey($categoryId)->exists()) {
            abort(404);
        }

        $data = $request->validate([
            'name'   => ['required', 'string', 'max:255'],
            'slug'   => ['nullable', 'string', 'max:255', 'unique:subcategories,slug'],
            'active' => ['required', 'boolean'],
        ]);

        $data['category_id'] = (int) $categoryId;

        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        Subcategory::create($data);

        return redirect()->back()->with('success', 'Podkategoria dodana.');
    }

    public function updateSubcategory(Request $request, Subcategory $subcategory)
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:subcategories,slug,' . $subcategory->id],
            'active' => ['required', 'boolean'],
        ]);

        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        if ($data['name'] !== $subcategory->name && empty($request->input('slug'))) {
            // jeśli zmieniłeś nazwę i nie podałeś sluga, przelicz go
            $data['slug'] = Str::slug($data['name']);
        }

        $subcategory->update($data);

        return redirect()->back()->with('success', 'Podkategoria zaktualizowana.');
    }

    public function destroySubcategory(Request $request, Subcategory $subcategory)
    {
        $this->ensureAdmin($request);

        try {
            // jeśli ma produkty, nie usuwamy - tylko dezaktywujemy
            if ($subcategory->products()->exists()) {
                $subcategory->update(['active' => false]);
                return redirect()->back()->with('success', 'Podkategoria miała produkty – została zdezaktywowana.');
            }

            $subcategory->delete();
            return redirect()->back()->with('success', 'Podkategoria usunięta.');
        } catch (QueryException) {
            return redirect()->back()->with('error', 'Nie udało się usunąć podkategorii.');
        }
    }

    public function toggleActive(Request $request, Category $category)
    {
        $this->ensureAdmin($request);

        $category->update([
            'active' => !$category->active,
        ]);

        return redirect()->back()->with('success', 'Zmieniono aktywność kategorii.');
    }
}
