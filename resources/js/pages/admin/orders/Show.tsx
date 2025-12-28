import React from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Link } from '@inertiajs/react';

const formatPrice = (grosze: number): string => {
  return (grosze / 100).toFixed(2).replace('.', ',') + ' zł';
};


type OrderItem = {
  id: number;
  product_name: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
};

type Order = {
  id: number;
  status: string;
  total_amount: number;
  created_at: string;

  customer_name: string;
  customer_email: string;
  customer_phone: string | null;

  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;

  user: { id: number; name: string; email: string } | null;
  items: OrderItem[];
};

export default function Show({ order }: { order: Order }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Zamówienie #{order.id}</h1>
        <Link href="/admin/orders" className="text-sm hover:underline">
          ← Wróć do listy
        </Link>
      </div>

      <div className="bg-white rounded shadow p-6 space-y-6">
        <div className="text-sm text-gray-700">
          <div><b>Status:</b> {order.status}</div>
          <div><b>Data:</b> {order.created_at}</div>
          <div><b>Suma:</b> {formatPrice(order.total_amount)}</div>
        </div>

        <div>
          <h2 className="font-semibold mb-2">Klient</h2>
          <div className="text-sm text-gray-700">
            <div><b>Imię i nazwisko:</b> {order.customer_name}</div>
            <div><b>Email:</b> {order.customer_email}</div>
            <div><b>Telefon:</b> {order.customer_phone ?? '-'}</div>
            {order.user && (
              <div className="mt-2 text-xs text-gray-500">
                Powiązany użytkownik: {order.user.name} ({order.user.email})
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-2">Adres dostawy</h2>
          <div className="text-sm text-gray-700">
            <div>{order.address_line1 ?? '-'}</div>
            {order.address_line2 ? <div>{order.address_line2}</div> : null}
            <div>
              {(order.postal_code ?? '')} {order.city ?? ''}
            </div>
            <div>{order.country ?? '-'}</div>
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-2">Pozycje</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Produkt</th>
                  <th className="py-2">Cena</th>
                  <th className="py-2">Ilość</th>
                  <th className="py-2">Suma</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id} className="border-b">
                    <td className="py-2">{it.product_name ?? '-'}</td>
                    <td className="py-2">{formatPrice(it.unit_price)}</td>
                    <td className="py-2">{it.quantity}</td>
                    <td className="py-2">{formatPrice(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

Show.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
