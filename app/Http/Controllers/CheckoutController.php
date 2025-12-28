<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CheckoutController extends Controller
{
    public function showPage(Request $request)
    {
        $default = null;

        if ($user = $request->user()) {
            $lastOrder = Order::where('user_id', $user->id)->latest()->first();

            if ($lastOrder) {
                $default = [
                    'customer_name'   => $lastOrder->customer_name,
                    'customer_email'  => $lastOrder->customer_email,
                    'customer_phone'  => $lastOrder->customer_phone,
                    'address_line1'   => $lastOrder->address_line1,
                    'address_line2'   => $lastOrder->address_line2,
                    'city'            => $lastOrder->city,
                    'postal_code'     => $lastOrder->postal_code,
                    'country'         => $lastOrder->country,

                    // nowe pola – z fallbackiem
                    'delivery_method' => $lastOrder->delivery_method ?? 'kurier',
                    'payment_method'  => $lastOrder->payment_method ?? 'przelew',
                ];
            } else {
                $default = [
                    'customer_name'   => $user->name ?? '',
                    'customer_email'  => $user->email ?? '',
                    'customer_phone'  => '',
                    'address_line1'   => '',
                    'address_line2'   => '',
                    'city'            => '',
                    'postal_code'     => '',
                    'country'         => 'Poland',

                    'delivery_method' => 'kurier',
                    'payment_method'  => 'przelew',
                ];
            }
        }

        return Inertia::render('shop/checkout', [
            'defaultForm'     => $default,
            'isAuthenticated' => (bool) $request->user(),
            'userId'          => optional($request->user())->id,
        ]);
    }

    public function checkout(Request $request)
    {
        $data = $request->validate([
            'session_id'       => 'required|string',
            'user_id'          => 'nullable|integer|exists:users,id',

            'customer_name'    => 'required|string',
            'customer_email'   => 'required|email',
            'customer_phone'   => 'required|string',

            'address_line1'    => 'required|string',
            'address_line2'    => 'nullable|string',
            'city'             => 'required|string',
            'postal_code'      => 'required|string',
            'country'          => 'required|string',

            'delivery_method'  => 'required|in:kurier,paczkomat,odbior',
            'payment_method'   => 'required|in:przelew,pobranie',
        ]);

        // 1) jeśli zalogowany
        if ($request->user()) {
            $data['user_id'] = $request->user()->id;
        }

        // 2) pobieramy koszyk + pozycje + produkty
        $cart = Cart::with('items.product')
            ->where('session_id', $data['session_id'])
            ->first();

        if (! $cart || $cart->items->isEmpty()) {
            return response()->json(['error' => 'Koszyk jest pusty.'], 422);
        }

        // 3) sprawdzenie stanów magazynowych
        foreach ($cart->items as $item) {
            if (! $item->product) {
                return response()->json(['error' => 'Jeden z produktów nie istnieje już w katalogu.'], 422);
            }

            if ($item->quantity > $item->product->stock) {
                return response()->json([
                    'error' => "Brak wystarczającej ilości produktu {$item->product->name} w magazynie.",
                ], 422);
            }
        }

        // 4) dostawa
        $deliveryPrice = match ($data['delivery_method']) {
            'kurier'    => 1499,
            'paczkomat' => 1299,
            'odbior'    => 0,
            default     => 0,
        };

        // 5) suma produktów + dostawa
        $itemsTotal = $cart->items->sum(fn ($item) => $item->quantity * $item->unit_price);
        $grandTotal = $itemsTotal + $deliveryPrice;

        // 6) tworzymy zamówienie
        $order = Order::create([
            'user_id'         => $data['user_id'] ?? null,
            'session_id'      => $data['session_id'],
            'status'          => 'pending',

            'customer_name'   => $data['customer_name'],
            'customer_email'  => $data['customer_email'],
            'customer_phone'  => $data['customer_phone'],

            'address_line1'   => $data['address_line1'],
            'address_line2'   => $data['address_line2'],
            'city'            => $data['city'],
            'postal_code'     => $data['postal_code'],
            'country'         => $data['country'],

            'delivery_method' => $data['delivery_method'],
            'payment_method'  => $data['payment_method'],

            'total_amount'    => $grandTotal,
        ]);

        // 7) pozycje zamówienia + stock
        foreach ($cart->items as $item) {
            OrderItem::create([
                'order_id'   => $order->id,
                'product_id' => $item->product_id,
                'unit_price' => $item->unit_price,
                'quantity'   => $item->quantity,
                'subtotal'   => $item->quantity * $item->unit_price,
            ]);

            $product = $item->product;
            $product->stock = max(0, $product->stock - $item->quantity);
            $product->save();
        }

        // 8) czyścimy koszyk (pozycje + sam koszyk)
        $cart->items()->delete();
        $cart->delete();

        return response()->json([
            'message' => 'OK',
            'order_id' => $order->id,
            'redirect_url' => route('checkout.success', ['order' => $order->id]),
        ]);
    }

    public function success(int $order)
    {
        return \Inertia\Inertia::render('shop/order-success', [
            'orderId' => $order,
        ]);
    }
}
