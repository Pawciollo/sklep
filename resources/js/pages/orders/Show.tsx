import React from "react";
import { Link, usePage } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";

type OrderItem = {
    id: number;
    unit_price: number;
    quantity: number;
    subtotal: number;
    product: {
        id: number;
        name: string;
        slug: string;
    };
};

type Order = {
    id: number;
    total_amount: number;
    delivery_price?: number | null;
    delivery_method?: string | null;

    status: string;
    created_at: string;

    customer_name: string;
    customer_email: string;
    customer_phone: string;

    address_line1: string;
    address_line2: string | null;
    city: string;
    postal_code: string;
    country: string;

    items: OrderItem[];
};

type PageProps = {
    order: Order;
};

function formatMoneyPLN(value: number) {
    return new Intl.NumberFormat("pl-PL", {
        style: "currency",
        currency: "PLN",
    }).format(value);
}

function formatDateTime(value: string) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat("pl-PL", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(d);
}

function statusLabel(status: string) {
    switch (status) {
        case "pending": return "Oczekuje";
        case "paid": return "Opłacone";
        case "shipped": return "Wysłane";
        case "cancelled": return "Anulowane";
        default: return status;
    }
}

function statusClasses(status: string) {
    switch (status) {
        case "pending": return "bg-yellow-100 text-yellow-800";
        case "paid": return "bg-green-100 text-green-800";
        case "shipped": return "bg-blue-100 text-blue-800";
        case "cancelled": return "bg-red-100 text-red-800";
        default: return "bg-gray-100 text-gray-800";
    }
}

export default function OrderShow() {
    const { order } = usePage<PageProps>().props;

    const itemsTotalCents = order.items.reduce((sum, item) => sum + item.subtotal, 0);
    const deliveryCents =
        (order.delivery_price ?? null) !== null
            ? (order.delivery_price as number)
            : Math.max(0, order.total_amount - itemsTotalCents);

    return (
        <main className="max-w-5xl mx-auto px-4 py-8 text-gray-900">
            <Link href="/orders" className="text-sm text-gray-700 hover:underline">
                ← Powrót do listy zamówień
            </Link>

            <h1 className="text-2xl font-bold mb-4 mt-4 text-gray-900">
                Zamówienie #{order.id}
            </h1>

            <div className="mb-6 bg-white rounded shadow-sm border p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-sm text-gray-700">
                            Data: {formatDateTime(order.created_at)}
                        </p>

                        <div className="text-sm text-gray-700 space-y-1 mt-2">
                            <div className="flex justify-between gap-8">
                                <span>Suma produktów:</span>
                                <strong>{formatMoneyPLN(itemsTotalCents / 100)}</strong>
                            </div>
                            <div className="flex justify-between gap-8">
                                <span>Dostawa:</span>
                                <strong>{formatMoneyPLN(deliveryCents / 100)}</strong>
                            </div>
                            <div className="flex justify-between gap-8">
                                <span>Razem:</span>
                                <strong>{formatMoneyPLN(order.total_amount / 100)}</strong>
                            </div>
                        </div>
                    </div>

                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusClasses(order.status)}`}>
                        {statusLabel(order.status)}
                    </span>
                </div>
            </div>

            <h2 className="text-xl font-semibold mb-2 text-gray-900">Adres dostawy</h2>
            <div className="mb-6 text-gray-800">
                <p>{order.customer_name}</p>
                <p>{order.address_line1}</p>
                {order.address_line2 && <p>{order.address_line2}</p>}
                <p>{order.postal_code} {order.city}</p>
                <p>{order.country}</p>
                <p>Tel: {order.customer_phone}</p>
            </div>

            <h2 className="text-xl font-semibold mb-2 text-gray-900">Produkty</h2>

            <div className="space-y-4">
                {order.items.map(item => (
                    <div key={item.id} className="p-4 border rounded bg-white shadow-sm text-gray-900">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                {/* ✅ klikana nazwa produktu */}
                                <Link
                                    href={`/products/${item.product.slug}`}
                                    className="font-semibold text-gray-900 hover:underline"
                                >
                                    {item.product.name}
                                </Link>

                                <p className="mt-1">Cena: {formatMoneyPLN(item.unit_price / 100)}</p>
                                <p>Ilość: {item.quantity}</p>
                                <p>Suma: {formatMoneyPLN(item.subtotal / 100)}</p>
                            </div>

                            {/* ✅ drugi, mały link (opcjonalny, ale czytelny) */}
                            <Link
                                href={`/products/${item.product.slug}`}
                                className="text-sm text-gray-700 hover:underline whitespace-nowrap"
                            >
                                Zobacz produkt →
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}

OrderShow.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
