import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';

type CartProduct = {
    id: number;
    name: string;
    slug: string;
    price: number;
    images?: string[] | null;
    stock?: number;
};

type CartItem = {
    id: number;
    product: CartProduct;
    quantity: number;
    subtotal: number;
};

type CartResponse = {
    items: CartItem[];
    total: number;
};

function formatPrice(cents: number): string {
    return (cents / 100).toFixed(2) + ' zł';
}

function imageUrl(path: string): string {
    if (!path) return path;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/storage/')) return path;
    if (path.startsWith('storage/')) return '/' + path;
    return `/storage/${path.replace(/^\/+/, '')}`;
}

export default function Cart() {
    const [cart, setCart] = useState<CartResponse>({ items: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [busyItemId, setBusyItemId] = useState<number | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const sessionId = 'demo-session';

    async function loadCart() {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch(`/api/cart?session_id=${encodeURIComponent(sessionId)}`, {
                headers: { Accept: 'application/json' },
            });

            if (!res.ok) throw new Error('Nie udało się pobrać koszyka.');

            const json: CartResponse = await res.json();
            setCart(json);
        } catch (e: unknown) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Wystąpił błąd przy ładowaniu koszyka.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCart();
    }, []);

    async function removeItem(itemId: number) {
        try {
            setError(null);
            setBusyItemId(itemId);

            const res = await fetch(`/api/cart/items/${itemId}`, {
                method: 'DELETE',
                headers: { Accept: 'application/json' },
            });

            if (!res.ok) throw new Error('Nie udało się usunąć produktu z koszyka.');

            await loadCart();

            setMessage('Usunięto produkt z koszyka.');
            setTimeout(() => setMessage(null), 2000);
        } catch (e: unknown) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Wystąpił błąd przy usuwaniu produktu.');
        } finally {
            setBusyItemId(null);
        }
    }

    async function setQuantity(item: CartItem, nextQty: number) {
        try {
            setError(null);
            setBusyItemId(item.id);

            const res = await fetch(`/api/cart/items/${item.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    quantity: nextQty,
                    session_id: sessionId,
                }),
            });

            if (!res.ok) {
                const data: { error?: string; left?: number } | null = await res.json().catch(() => null);
                throw new Error(data?.error ?? 'Nie udało się zmienić ilości.');
            }

            const json: CartResponse = await res.json();
            setCart(json);

            if (nextQty === 0) {
                setMessage('Usunięto produkt z koszyka.');
                setTimeout(() => setMessage(null), 2000);
            }
        } catch (e: unknown) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Wystąpił błąd przy zmianie ilości.');
        } finally {
            setBusyItemId(null);
        }
    }

    const nearStockMessages = useMemo(() => {
        return cart.items
            .map((item) => {
                const stock = item.product.stock ?? null;
                if (stock === null) return null;

                const left = stock - item.quantity;
                if (left <= 0) return `Uwaga: ${item.product.name} — brak więcej sztuk.`;
                if (left <= 3) return `Uwaga: ${item.product.name} — zostało tylko ${left} szt.`;
                return null;
            })
            .filter((x): x is string => x !== null);
    }, [cart.items]);

    if (loading) {
        return <div className="p-8 text-center text-lg">Ładowanie koszyka...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="max-w-4xl mx-auto px-4 py-8">
                <a href="/" className="text-sm text-blue-600 hover:underline">
                    ← Wróć do sklepu
                </a>

                {error && <div className="mt-4 rounded bg-red-100 text-red-700 px-4 py-2">{error}</div>}

                {message && <div className="mt-4 rounded bg-green-100 text-green-700 px-4 py-2">{message}</div>}

                {nearStockMessages.length > 0 && (
                    <div className="mt-4 rounded bg-yellow-50 text-yellow-800 px-4 py-2 text-sm space-y-1">
                        {nearStockMessages.map((m) => (
                            <div key={m}>{m}</div>
                        ))}
                    </div>
                )}

                <h1 className="mt-6 text-2xl font-bold text-gray-900">Twój koszyk</h1>

                {cart.items.length === 0 ? (
                    <p className="mt-4 text-gray-700">Twój koszyk jest pusty.</p>
                ) : (
                    <>
                        <div className="mt-6 space-y-4">
                            {cart.items.map((item) => {
                                const thumbRaw = item.product.images?.[0] ?? null;
                                const thumb = thumbRaw ? imageUrl(thumbRaw) : null;

                                const stock = item.product.stock ?? null;

                                const canMinus = item.quantity > 1;
                                const canPlus = stock === null ? true : item.quantity < stock;

                                return (
                                    <div key={item.id} className="bg-white rounded shadow p-4 flex gap-4 items-center">
                                        <a href={`/products/${item.product.slug}`} className="shrink-0">
                                            {thumb ? (
                                                <img
                                                    src={thumb}
                                                    alt={item.product.name}
                                                    className="w-16 h-16 object-cover rounded"
                                                    onError={(e) => {
                                                        // jeśli obrazek faktycznie nie istnieje / zła ścieżka:
                                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            ) : null}

                                            {!thumb && (
                                                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs">
                                                    Brak
                                                </div>
                                            )}

                                            {thumb && (
                                                <div
                                                    className="w-16 h-16 bg-gray-200 rounded items-center justify-center text-gray-500 text-xs hidden"
                                                    aria-hidden="true"
                                                >
                                                    Brak
                                                </div>
                                            )}
                                        </a>

                                        <div className="flex-1">
                                            <div className="text-sm text-gray-500">{item.product.slug}</div>
                                            <div className="font-semibold text-gray-900">{item.product.name}</div>

                                            <div className="text-sm text-gray-700 mt-1">
                                                Cena: {formatPrice(item.product.price)} × {item.quantity}
                                            </div>

                                            <div className="mt-3 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={!canMinus || busyItemId === item.id}
                                                    onClick={() => setQuantity(item, item.quantity - 1)}
                                                    className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                                                >
                                                    −
                                                </button>

                                                <div className="w-10 text-center text-sm font-medium">{item.quantity}</div>

                                                <button
                                                    type="button"
                                                    disabled={!canPlus || busyItemId === item.id}
                                                    onClick={() => setQuantity(item, item.quantity + 1)}
                                                    className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                                                >
                                                    +
                                                </button>

                                                {stock !== null && <div className="ml-2 text-xs text-gray-500">Stan: {stock}</div>}
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="font-bold text-gray-900">{formatPrice(item.subtotal)}</div>
                                            <button
                                                type="button"
                                                disabled={busyItemId === item.id}
                                                onClick={() => removeItem(item.id)}
                                                className="mt-2 text-sm text-red-600 hover:underline disabled:opacity-50"
                                            >
                                                Usuń
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 bg-white rounded shadow p-4 flex items-center justify-between">
                            <div className="font-semibold text-gray-900">Suma produktów:</div>
                            <div className="font-bold text-gray-900">{formatPrice(cart.total)}</div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <a
                                href="/checkout"
                                className="inline-flex items-center px-4 py-2 rounded bg-gray-900 text-white text-sm hover:bg-gray-800 transition"
                            >
                                Przejdź do zamówienia
                            </a>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

Cart.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
