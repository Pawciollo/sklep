import React from "react";
import { Link, usePage } from "@inertiajs/react";
import AppLayout from '@/layouts/app-layout';

type Order = {
    id: number;
    total_amount: number;
    status: string;
    created_at: string;
};

type PageProps = {
    orders: Order[];
};

function formatMoneyPLN(value: number) {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
    }).format(value);
}

function formatDateTime(value: string) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat('pl-PL', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(d);
}

function statusLabel(status: string) {
    switch (status) {
        case 'pending': return 'Oczekuje';
        case 'paid': return 'Opłacone';
        case 'shipped': return 'Wysłane';
        case 'cancelled': return 'Anulowane';
        default: return status;
    }
}

function statusClasses(status: string) {
    switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'paid': return 'bg-green-100 text-green-800';
        case 'shipped': return 'bg-blue-100 text-blue-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

export default function OrdersIndex() {
    const { orders } = usePage<PageProps>().props;

    return (
        <main className="max-w-5xl mx-auto px-4 py-8 text-gray-900">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Moje zamówienia</h1>

            {orders.length === 0 && (
                <p className="text-gray-700">Nie masz jeszcze żadnych zamówień.</p>
            )}

            <div className="grid gap-4">
                {orders.map(order => (
                    <div
                        key={order.id}
                        className="border rounded p-4 bg-white shadow-sm flex justify-between items-center"
                    >
                        <div>
                            <p className="font-semibold text-gray-900">
                                Zamówienie #{order.id}
                            </p>
                            <p className="text-sm text-gray-700">
                                Status:{' '}
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusClasses(order.status)}`}>
                                    {statusLabel(order.status)}
                                </span>
                            </p>
                            <p className="text-sm text-gray-700">
                                Kwota: {formatMoneyPLN(order.total_amount / 100)}
                            </p>
                            <p className="text-xs text-gray-500">
                                Data: {formatDateTime(order.created_at)}
                            </p>
                        </div>

                        <Link
                            href={`/orders/${order.id}`}
                            className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
                        >
                            Szczegóły
                        </Link>
                    </div>
                ))}
            </div>
        </main>
    );
}

OrdersIndex.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
