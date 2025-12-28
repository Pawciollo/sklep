<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\OrderController;

// Admin controllers
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\DashboardController;

/*
|--------------------------------------------------------------------------
| Strona główna
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
    return Inertia::render('shop/home');
})->name('home');

/*
|--------------------------------------------------------------------------
| Dashboard (starter kit)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

/*
|--------------------------------------------------------------------------
| Starter kit routes (login/register/settings/profile itp.)
|--------------------------------------------------------------------------
*/
require __DIR__ . '/auth.php';
require __DIR__ . '/settings.php';

/*
|--------------------------------------------------------------------------
| Sklep (Inertia)
|--------------------------------------------------------------------------
*/
Route::get('/products', fn () => Inertia::render('shop/products'))->name('products');
Route::get('/products/{slug}', fn (string $slug) => Inertia::render('shop/ProductShow', ['slug' => $slug]))
    ->name('products.show');

Route::get('/cart', fn () => Inertia::render('shop/cart'))->name('cart');

Route::get('/checkout', [CheckoutController::class, 'showPage'])->name('checkout.show');
Route::post('/checkout', [CheckoutController::class, 'checkout'])->name('checkout.process');

Route::get('/order-success/{order}', [\App\Http\Controllers\CheckoutController::class, 'success'])->name('checkout.success');

/*
|--------------------------------------------------------------------------
| Zamówienia użytkownika (Inertia)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->group(function () {
    Route::get('/orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('/orders/{order}', [OrderController::class, 'show'])->name('orders.show');
});

/*
|--------------------------------------------------------------------------
| Admin (Inertia) — wszystko pod /admin/*
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->prefix('admin')->group(function () {

    // Zamówienia (lista + status) – masz to w zwykłym OrderController
    Route::get('/orders', [OrderController::class, 'adminIndex'])->name('admin.orders.index');
    Route::patch('/orders/{order}/status', [OrderController::class, 'adminUpdateStatus'])->name('admin.orders.updateStatus');

    // Zamówienia (szczegóły) – masz to w Admin\OrderController
    Route::get('/orders/{order}', [AdminOrderController::class, 'show'])->name('admin.orders.show');

    // Produkty
    Route::get('/products', [AdminProductController::class, 'index'])->name('admin.products.index');
    Route::post('/products', [AdminProductController::class, 'store'])->name('admin.products.store');
    Route::patch('/products/{product}', [AdminProductController::class, 'update'])->name('admin.products.update');
    Route::delete('/products/{product}', [AdminProductController::class, 'destroy'])->name('admin.products.destroy');

    // (opcjonalnie – jeśli kiedyś wrócisz do osobnej strony edit, a nie inline)
    Route::get('/products/{product}/edit', [AdminProductController::class, 'edit'])->name('admin.products.edit');

    // Kategorie (CRUD inline)
    Route::get('/categories', [AdminCategoryController::class, 'index'])->name('admin.categories.index');
    Route::post('/categories', [AdminCategoryController::class, 'store'])->name('admin.categories.store');
    Route::patch('/categories/{category}', [AdminCategoryController::class, 'update'])->name('admin.categories.update');
    Route::delete('/categories/{category}', [AdminCategoryController::class, 'destroy'])->name('admin.categories.destroy');

    /**
     * ✅ KLUCZOWA ZMIANA:
     * Panel admina wysyła dodawanie podkategorii na:
     * POST /admin/categories/{category}/subcategories
     * więc dodajemy trasę dokładnie pod ten URL.
     */
    Route::post('/categories/{category}/subcategories', [AdminCategoryController::class, 'storeSubcategory'])
        ->name('admin.categories.subcategories.store');

    // Podkategorie (CRUD inline w admin/categories) — zostawiamy jak było
    Route::post('/subcategories', [AdminCategoryController::class, 'storeSubcategory'])->name('admin.subcategories.store');
    Route::patch('/subcategories/{subcategory}', [AdminCategoryController::class, 'updateSubcategory'])->name('admin.subcategories.update');
    Route::delete('/subcategories/{subcategory}', [AdminCategoryController::class, 'destroySubcategory'])->name('admin.subcategories.destroy');

    Route::patch('/categories/{category}/toggle', [\App\Http\Controllers\CategoryController::class, 'toggleActive'])->name('admin.categories.toggle');

    Route::get('/', [\App\Http\Controllers\Admin\DashboardController::class, 'index'])
        ->name('admin.dashboard');
});
