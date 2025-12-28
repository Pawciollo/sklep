<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OrderController extends Controller
{
    /**
     * Lista zamówień zalogowanego użytkownika
     */
    public function index(Request $request)
    {
        $orders = Order::where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return Inertia::render('orders/Index', [
            'orders' => $orders
        ]);
    }

    /**
     * Szczegóły jednego zamówienia
     */
    public function show(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id) {
            abort(403, "Nie masz dostępu do tego zamówienia.");
        }

        $order->load('items.product');

        if ($order->delivery_price === null) {
            $method = $order->delivery_method;

            $order->delivery_price = match ($method) {
                'kurier'    => 1499,
                'paczkomat' => 1299,
                'odbior'    => 0,
                default     => 0,
            };
        }

        return Inertia::render('orders/Show', [
            'order' => $order
        ]);
    }

    public function adminIndex(Request $request)
    {
        $user = $request->user();

        if (!$user || !$user->is_admin) {
            abort(403, 'Tylko admin ma dostęp do tej strony.');
        }

        // 🔹 sortowanie
        $sort = (string) $request->query('sort', 'created_at');
        $dir  = strtolower((string) $request->query('dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowedSorts = ['id', 'user_name', 'customer_email', 'status', 'total_amount', 'created_at'];
        if (!in_array($sort, $allowedSorts, true)) {
            $sort = 'created_at';
        }

        // 🔹 filtry
        $filters = [
            'status' => $request->query('status') ?: null,
            'date_from' => $request->query('date_from') ?: null,
            'date_to' => $request->query('date_to') ?: null,
        ];

        $query = Order::query()->with('user');

        if ($filters['status']) {
            $query->where('status', $filters['status']);
        }

        if ($filters['date_from']) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if ($filters['date_to']) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        // 🔹 SORTOWANIE (KLUCZOWE)
        if ($sort === 'user_name') {
            $query->leftJoin('users as u', 'orders.user_id', '=', 'u.id')
                ->select('orders.*')
                ->orderBy('u.name', $dir);
        } else {
            $columnMap = [
                'id' => 'orders.id',
                'customer_email' => 'orders.customer_email',
                'status' => 'orders.status',
                'total_amount' => 'orders.total_amount',
                'created_at' => 'orders.created_at',
            ];

            $query->orderBy($columnMap[$sort] ?? 'orders.created_at', $dir);
        }

        $orders = $query->get()->map(function ($order) {
            return [
                'id' => $order->id,
                'user_name' => $order->user->name ?? null,
                'customer_email' => $order->customer_email,
                'status' => $order->status,
                'total_amount' => $order->total_amount / 100,
                'created_at' => $order->created_at->format('Y-m-d H:i'),
            ];
        });

        return Inertia::render('admin/orders/Index', [
            'orders' => $orders,
            'filters' => $filters,

            // 🔥 TO JEST KLUCZ – frontend wie w jakim stanie jest sort
            'sort' => $sort,
            'dir'  => $dir,
        ]);
    }

    public function adminUpdateStatus(Request $request, Order $order)
    {
        $user = $request->user();

        if (! $user || ! $user->is_admin) {
            abort(403, 'Tylko admin ma dostęp do tej akcji.');
        }

        $data = $request->validate([
            'status' => 'required|in:pending,paid,shipped,delivered,cancelled',
        ]);

        $order->status = $data['status'];
        $order->save();

        return back();
    }
}
