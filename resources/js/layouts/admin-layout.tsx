import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Link, usePage } from '@inertiajs/react';

type Props = {
    children: React.ReactNode;
};

export default function AdminLayout({ children }: Props) {
    const { url } = usePage();

    const linkClass = (path: string) =>
        `hover:underline ${
            url.startsWith(path) ? 'font-semibold text-gray-900' : 'text-gray-600'
        }`;

    return (
        <AppLayout>
            <div className="mb-6 border-b pb-3 flex gap-6 text-sm">
                <Link
                    href="/admin"
                    className={linkClass('/admin')}
                >
                    Dashboard
                </Link>

                <Link
                    href="/admin/orders"
                    className={linkClass('/admin/orders')}
                >
                    Zamówienia
                </Link>

                <Link
                    href="/admin/products"
                    className={linkClass('/admin/products')}
                >
                    Produkty
                </Link>

                <Link
                    href="/admin/categories"
                    className={linkClass('/admin/categories')}
                >
                    Kategorie
                </Link>
            </div>

            {children}
        </AppLayout>
    );
}
