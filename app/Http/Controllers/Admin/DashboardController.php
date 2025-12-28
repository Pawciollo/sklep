<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Category;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
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

        $today = Carbon::today();

        $totalOrders = Order::count();
        $pendingOrders = Order::where('status', 'pending')->count();
        $todayOrders = Order::whereDate('created_at', $today)->count();

        $revenueTotal = (int) Order::sum('total_amount');
        $revenueToday = (int) Order::whereDate('created_at', $today)->sum('total_amount');

        $productsTotal = Product::count();
        $productsActive = Product::where('active', true)->count();
        $lowStock = Product::where('stock', '<=', 5)->count();

        $categoriesActive = Category::where('active', true)->count();

        $recentOrders = Order::query()
            ->with('user')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(function ($order) {
                return [
                    'id' => $order->id,
                    'status' => $order->status,
                    'total_amount' => (int) $order->total_amount,
                    'created_at' => $order->created_at?->format('Y-m-d H:i'),
                    'customer_name' => $order->customer_name,
                    'customer_email' => $order->customer_email,
                    'user' => $order->user ? [
                        'id' => $order->user->id,
                        'name' => $order->user->name,
                        'email' => $order->user->email,
                    ] : null,
                ];
            });

        return Inertia::render('admin/dashboard/Index', [
            'stats' => [
                'total_orders' => $totalOrders,
                'pending_orders' => $pendingOrders,
                'today_orders' => $todayOrders,
                'revenue_total' => $revenueTotal,
                'revenue_today' => $revenueToday,
                'products_total' => $productsTotal,
                'products_active' => $productsActive,
                'low_stock' => $lowStock,
                'categories_active' => $categoriesActive,
            ],
            'recentOrders' => $recentOrders,
        ]);
    }
}
