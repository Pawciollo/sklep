<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\Request;

class CartController extends Controller
{
    protected function getCart(string $sessionId): Cart
    {
        return Cart::firstOrCreate(
            ['session_id' => $sessionId],
            ['user_id' => null]
        );
    }

    public function show(Request $request)
    {
        $sessionId = $request->query('session_id', 'demo-session');

        $cart = Cart::with(['items.product'])
            ->where('session_id', $sessionId)
            ->first();

        if (! $cart) {
            return [
                'items' => [],
                'total' => 0,
            ];
        }

        $items = $cart->items->map(function (CartItem $item) {
            return [
                'id'       => $item->id,
                'product'  => [
                    'id'     => $item->product->id,
                    'name'   => $item->product->name,
                    'slug'   => $item->product->slug,
                    'price'  => $item->unit_price,
                    'images' => $item->product->images,
                    'stock'  => $item->product->stock,
                ],
                'quantity' => $item->quantity,
                'subtotal' => $item->quantity * $item->unit_price,
            ];
        });

        $total = $items->sum('subtotal');

        return [
            'items' => $items->values(),
            'total' => $total,
        ];
    }

    public function add(Request $request)
    {
        $request->validate([
            'product_id' => 'required|integer|exists:products,id',
        ]);

        $product = Product::findOrFail($request->product_id);

        if ($product->stock <= 0) {
            return response()->json([
                'error' => 'Produkt niedostępny — brak w magazynie.',
            ], 422);
        }

        $sessionId = $request->input('session_id', 'demo-session');
        $cart = $this->getCart($sessionId);

        $item = $cart->items()->where('product_id', $product->id)->first();
        $currentQty = $item?->quantity ?? 0;

        if ($currentQty + 1 > $product->stock) {
            $left = max(0, $product->stock - $currentQty);

            return response()->json([
                'error' => "Nie możesz dodać więcej sztuk — zostało tylko {$left} szt.",
                'left'  => $left,
            ], 422);
        }

        if ($item) {
            $item->increment('quantity', 1);
        } else {
            $cart->items()->create([
                'product_id' => $product->id,
                'quantity'   => 1,
                'unit_price' => $product->price,
            ]);
        }

        return response()->json(['ok' => true]);
    }

    public function update(Request $request, CartItem $item)
    {
        $request->validate([
            'quantity'   => 'required|integer|min:0',
            'session_id' => 'nullable|string',
        ]);

        $sessionId = $request->input('session_id', 'demo-session');

        $item->load('cart', 'product');
        if (! $item->cart || $item->cart->session_id !== $sessionId) {
            return response()->json(['error' => 'Brak dostępu do tego koszyka.'], 403);
        }

        $qty = (int) $request->quantity;
        $stock = (int) ($item->product->stock ?? 0);

        if ($qty === 0) {
            $item->delete();
            return $this->show(new Request(['session_id' => $sessionId]));
        }

        if ($stock <= 0) {
            return response()->json([
                'error' => 'Produkt niedostępny — brak w magazynie.',
                'left'  => 0,
            ], 422);
        }

        if ($qty > $stock) {
            return response()->json([
                'error' => "Nie możesz ustawić takiej ilości — zostało tylko {$stock} szt.",
                'left'  => $stock,
            ], 422);
        }

        $item->quantity = $qty;
        $item->save();

        return $this->show(new Request(['session_id' => $sessionId]));
    }

    public function remove(CartItem $item)
    {
        $item->delete();
        return response()->json(['ok' => true]);
    }
}
