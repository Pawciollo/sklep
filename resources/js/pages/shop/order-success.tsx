import React from 'react';
import { usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

type PageProps = {
    order_id?: number;
    orderId?: number;
};

export default function OrderSuccess() {
    const { order_id, orderId } = usePage<PageProps>().props;
    const id = order_id ?? orderId ?? null;

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="max-w-4xl mx-auto px-4 py-10">
                <div className="bg-white rounded shadow p-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Dziękujemy!</h1>

                    <p className="mt-2 text-gray-700">
                        Zamówienie zostało złożone{typeof id === 'number' ? <>. Numer: <b>#{id}</b></> : '.'}
                    </p>

                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <a
                            href="/"
                            className="inline-flex items-center px-4 py-2 rounded bg-gray-900 text-white text-sm hover:bg-gray-800 transition"
                        >
                            Wróć do sklepu
                        </a>

                        <a
                            href="/cart"
                            className="inline-flex items-center px-4 py-2 rounded border text-sm hover:bg-gray-50 transition"
                        >
                            Koszyk
                        </a>

                        {typeof id === 'number' && (
                            <a
                                href={`/orders/${id}`}
                                className="inline-flex items-center px-4 py-2 rounded border text-sm hover:bg-gray-50 transition"
                            >
                                Zobacz szczegóły zamówienia
                            </a>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

OrderSuccess.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
