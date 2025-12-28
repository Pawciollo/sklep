// resources/js/layouts/auth/auth-simple-layout.tsx
import React from 'react';

type Props = {
    title: string;
    description?: string;
    children: React.ReactNode;
};

export default function AuthLayoutTemplate({ title, description, children }: Props) {
    return (
        <div className="min-h-screen bg-gray-100">
            {/* Prosty header sklepu */}
            <header className="bg-white shadow">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <a
                        href="/"
                        className="text-2xl font-bold text-gray-900 hover:text-gray-700 transition"
                    >
                        Sklep fitness
                    </a>

                    <div className="text-sm text-gray-700">
                        <a href="/products" className="hover:underline">
                            Wróć do sklepu
                        </a>
                    </div>
                </div>
            </header>

            {/* Karta */}
            <main className="max-w-md mx-auto px-4 py-10">
                <div className="bg-white rounded-lg shadow p-6">
                    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                    {description ? (
                        <p className="mt-1 text-sm text-gray-600">{description}</p>
                    ) : null}

                    <div className="mt-6">{children}</div>
                </div>
            </main>
        </div>
    );
}
