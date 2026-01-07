import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

type CartProduct = {
    id: number;
    name: string;
    slug: string;
    price: number;
    images?: string[] | null;
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

type DeliveryMethod = 'kurier' | 'paczkomat' | 'odbior';
type PaymentMethod = 'przelew' | 'pobranie';

type CheckoutForm = {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    postal_code: string;
    country: string;
    delivery_method: DeliveryMethod;
    payment_method: PaymentMethod;
};

type PageProps = {
    defaultForm?: Partial<CheckoutForm> | null;
    isAuthenticated: boolean;
    userId?: number | null;
};

type CheckoutResponse = {
    order_id: number;
    redirect_url?: string;
};

function isCheckoutResponse(x: unknown): x is CheckoutResponse {
    if (!x || typeof x !== 'object') return false;
    const obj = x as Record<string, unknown>;
    return typeof obj.order_id === 'number' && (obj.redirect_url === undefined || typeof obj.redirect_url === 'string');
}

function formatPrice(cents: number): string {
    return (cents / 100).toFixed(2) + ' zł';
}

function deliveryLabel(m: DeliveryMethod): string {
    if (m === 'kurier') return 'Kurier';
    if (m === 'paczkomat') return 'Paczkomat';
    return 'Odbiór osobisty';
}

function paymentLabel(m: PaymentMethod): string {
    return m === 'przelew' ? 'Przelew' : 'Płatność przy odbiorze';
}

/**
 * Front-only spolszczenie walidacji:
 * - nie tłumaczymy angielskich zdań (kruche),
 * - opieramy się o klucz pola, który backend zwraca w `errors`.
 */
const REQUIRED_MESSAGE_PL: Record<string, string> = {
    customer_name: 'Pole imię i nazwisko jest wymagane.',
    customer_email: 'Pole adres e-mail jest wymagane.',
    customer_phone: 'Pole numer telefonu jest wymagane.',
    address_line1: 'Pole adres jest wymagane.',
    address_line2: 'Pole adres (cd.) jest wymagane.',
    city: 'Pole miasto jest wymagane.',
    postal_code: 'Pole kod pocztowy jest wymagane.',
    country: 'Pole kraj jest wymagane.',
    delivery_method: 'Wybierz metodę dostawy.',
    payment_method: 'Wybierz metodę płatności.',
};

const FIELD_LABEL_PL: Record<string, string> = {
    customer_name: 'imię i nazwisko',
    customer_email: 'adres e-mail',
    customer_phone: 'numer telefonu',
    address_line1: 'adres',
    address_line2: 'adres (cd.)',
    city: 'miasto',
    postal_code: 'kod pocztowy',
    country: 'kraj',
    delivery_method: 'metoda dostawy',
    payment_method: 'metoda płatności',
};

function polishValidationMessage(fieldKey: string, backendMsg: string): string {
    const lower = backendMsg.trim().toLowerCase();

    // email
    if (fieldKey === 'customer_email' && (lower.includes('valid email') || lower.includes('email address'))) {
        return 'Pole adres e-mail musi być poprawnym adresem e-mail.';
    }

    // numeric / number (jeśli kiedykolwiek dojdzie)
    if (lower.includes('must be a number') || lower.includes('must be numeric') || lower.includes('must be an integer')) {
        const label = FIELD_LABEL_PL[fieldKey] ?? fieldKey;
        return `Pole ${label} musi być liczbą.`;
    }

    // default: required (najczęstsze)
    if (REQUIRED_MESSAGE_PL[fieldKey]) return REQUIRED_MESSAGE_PL[fieldKey];

    // fallback po polsku
    const label = FIELD_LABEL_PL[fieldKey] ?? fieldKey;
    return `Formularz zawiera błąd w polu: ${label}.`;
}

export default function Checkout() {
    const { defaultForm, isAuthenticated, userId } = usePage<PageProps>().props;

    const initialForm: CheckoutForm = {
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        address_line1: '',
        address_line2: null,
        city: '',
        postal_code: '',
        country: 'Poland',
        delivery_method: 'kurier',
        payment_method: 'przelew',
    };

    const [form, setForm] = useState<CheckoutForm>({
        ...initialForm,
        ...(defaultForm ?? {}),
    });

    useEffect(() => {
        setForm({ ...initialForm, ...(defaultForm ?? {}) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultForm]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [cart, setCart] = useState<CartResponse>({ items: [], total: 0 });
    const [cartLoading, setCartLoading] = useState(true);

    const sessionId = 'demo-session';

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) {
        const { name, value } = e.target;

        setForm((prev) => {
            if (name === 'delivery_method') {
                const next = (value === 'kurier' || value === 'paczkomat' || value === 'odbior')
                    ? value
                    : prev.delivery_method;

                return { ...prev, delivery_method: next };
            }

            if (name === 'payment_method') {
                const next = (value === 'przelew' || value === 'pobranie')
                    ? value
                    : prev.payment_method;

                return { ...prev, payment_method: next };
            }

            if (name === 'address_line2') {
                return { ...prev, address_line2: value === '' ? null : value };
            }

            return { ...prev, [name]: value } as CheckoutForm;
        });
    }

    async function loadCart() {
        try {
            setCartLoading(true);
            const res = await fetch(`/api/cart?session_id=${encodeURIComponent(sessionId)}`, {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) throw new Error('Nie udało się pobrać koszyka.');
            const json: CartResponse = await res.json();
            setCart(json);
        } catch (e) {
            console.error(e);
        } finally {
            setCartLoading(false);
        }
    }

    useEffect(() => {
        void loadCart();
    }, []);

    const deliveryPrice = useMemo(() => {
        if (form.delivery_method === 'kurier') return 1499;
        if (form.delivery_method === 'paczkomat') return 1299;
        return 0;
    }, [form.delivery_method]);

    const grandTotal = cart.total + deliveryPrice;

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);

        try {
            setLoading(true);

            const tokenElement = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
            const csrfToken = tokenElement?.content ?? '';

            const res = await fetch('/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    user_id: userId ?? null,
                    ...form,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);

                if (res.status === 422 && data && typeof data === 'object' && 'errors' in data) {
                    const errors = (data as { errors?: Record<string, string[]> }).errors;
                    const firstKey = errors ? Object.keys(errors)[0] : undefined;
                    const firstMsg = firstKey ? errors?.[firstKey]?.[0] : undefined;

                    if (firstKey && typeof firstMsg === 'string') {
                        throw new Error(polishValidationMessage(firstKey, firstMsg));
                    }

                    throw new Error('Formularz zawiera błędy. Sprawdź wymagane pola.');
                }

                const msg =
                    data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
                        ? (data as { error: string }).error
                        : 'Nie udało się złożyć zamówienia.';

                throw new Error(msg);
            }

            const json: unknown = await res.json();
            if (!isCheckoutResponse(json)) {
                throw new Error('Nieprawidłowa odpowiedź serwera po złożeniu zamówienia.');
            }

            if (json.redirect_url) {
                window.location.href = json.redirect_url;
                return;
            }

            window.location.href = `/order-success/${json.order_id}`;
        } catch (e: unknown) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Wystąpił błąd przy składaniu zamówienia.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="max-w-5xl mx-auto px-4 py-8">
                <a href="/cart" className="text-sm text-blue-600 hover:underline">
                    ← Wróć do koszyka
                </a>

                {error && (
                    <div className="mt-4 rounded bg-red-100 text-red-700 px-4 py-2">
                        {error}
                    </div>
                )}

                {isAuthenticated && (
                    <p className="mt-4 text-sm text-gray-600">
                        Jesteś zalogowany – dane zostały wstępnie uzupełnione na podstawie profilu / poprzedniego zamówienia.
                    </p>
                )}

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* FORMULARZ */}
                    <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded shadow p-6 space-y-4">
                        <h1 className="text-2xl font-bold text-gray-900">Dane do zamówienia</h1>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-700">Imię i nazwisko</label>
                                <input
                                    name="customer_name"
                                    value={form.customer_name}
                                    onChange={handleChange}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-700">E-mail</label>
                                <input
                                    name="customer_email"
                                    value={form.customer_email}
                                    onChange={handleChange}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-700">Telefon</label>
                                <input
                                    name="customer_phone"
                                    value={form.customer_phone}
                                    onChange={handleChange}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-700">Kraj</label>
                                <input
                                    name="country"
                                    value={form.country}
                                    onChange={handleChange}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-gray-700">Adres</label>
                            <input
                                name="address_line1"
                                value={form.address_line1}
                                onChange={handleChange}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-700">Adres (cd.)</label>
                            <input
                                name="address_line2"
                                value={form.address_line2 ?? ''}
                                onChange={handleChange}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-700">Miasto</label>
                                <input
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-700">Kod pocztowy</label>
                                <input
                                    name="postal_code"
                                    value={form.postal_code}
                                    onChange={handleChange}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">Dostawa</h2>
                            <select
                                name="delivery_method"
                                value={form.delivery_method}
                                onChange={handleChange}
                                className="w-full border rounded px-3 py-2"
                            >
                                <option value="kurier">Kurier — 14,99 zł</option>
                                <option value="paczkomat">Paczkomat — 12,99 zł</option>
                                <option value="odbior">Odbiór osobisty — 0 zł</option>
                            </select>
                        </div>

                        <div className="pt-4 border-t">
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">Płatność</h2>
                            <select
                                name="payment_method"
                                value={form.payment_method}
                                onChange={handleChange}
                                className="w-full border rounded px-3 py-2"
                            >
                                <option value="przelew">Przelew</option>
                                <option value="pobranie">Płatność przy odbiorze</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || cart.items.length === 0}
                            className="w-full mt-2 bg-gray-900 text-white rounded px-4 py-2 disabled:opacity-50"
                        >
                            {loading ? 'Składanie zamówienia...' : 'Złóż zamówienie'}
                        </button>
                    </form>

                    {/* PODSUMOWANIE */}
                    <aside className="bg-white rounded shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900">Podsumowanie</h2>

                        {cartLoading ? (
                            <p className="mt-3 text-sm text-gray-600">Ładowanie koszyka...</p>
                        ) : cart.items.length === 0 ? (
                            <p className="mt-3 text-sm text-gray-600">Koszyk jest pusty.</p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {cart.items.map((it) => (
                                    <div key={it.id} className="flex items-start justify-between gap-3 text-sm">
                                        <div>
                                            <div className="font-medium text-gray-900">{it.product.name}</div>
                                            <div className="text-gray-600">
                                                {formatPrice(it.product.price)} × {it.quantity}
                                            </div>
                                        </div>
                                        <div className="font-medium text-gray-900">{formatPrice(it.subtotal)}</div>
                                    </div>
                                ))}

                                <div className="pt-3 border-t space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Produkty</span>
                                        <span className="font-medium">{formatPrice(cart.total)}</span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Dostawa ({deliveryLabel(form.delivery_method)})</span>
                                        <span className="font-medium">{formatPrice(deliveryPrice)}</span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Płatność</span>
                                        <span className="font-medium">{paymentLabel(form.payment_method)}</span>
                                    </div>

                                    <div className="pt-2 border-t flex justify-between text-base">
                                        <span className="font-semibold">Razem</span>
                                        <span className="font-semibold">{formatPrice(grandTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </main>
        </div>
    );
}

Checkout.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
