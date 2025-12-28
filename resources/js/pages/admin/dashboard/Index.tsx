import React from "react";
import { Link, usePage } from "@inertiajs/react";
import AdminLayout from "@/layouts/admin-layout";

type UserMini = { id: number; name: string; email: string };

type OrderRow = {
  id: number;
  status: string;
  total_amount: number;
  created_at: string | null;
  customer_name: string | null;
  customer_email: string | null;
  user: UserMini | null;
};

type Stats = {
  total_orders: number;
  pending_orders: number;
  today_orders: number;
  revenue_total: number;
  revenue_today: number;
  products_total: number;
  products_active: number;
  low_stock: number;
  categories_active: number;
};

type PageProps = {
  stats: Stats;
  recentOrders: OrderRow[];
};

function formatPrice(grosze: number) {
  return (grosze / 100).toFixed(2) + " zł";
}

function statusLabel(status: string) {
  if (status === "pending") return "Oczekujące";
  if (status === "paid") return "Opłacone";
  if (status === "shipped") return "Wysłane";
  if (status === "cancelled") return "Anulowane";
  return status;
}

export default function AdminDashboard() {
  const { stats, recentOrders } = usePage<PageProps>().props;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 text-gray-900">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Panel admina – dashboard</h1>

      </div>

      {/* Kafelki */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-600">Zamówienia (łącznie)</div>
          <div className="text-2xl font-bold">{stats.total_orders}</div>
        </div>

        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-600">Zamówienia dziś</div>
          <div className="text-2xl font-bold">{stats.today_orders}</div>
        </div>

        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-600">Oczekujące na opłacenie</div>
          <div className="text-2xl font-bold">{stats.pending_orders}</div>
        </div>

        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-600">Obrót dziś</div>
          <div className="text-2xl font-bold">{formatPrice(stats.revenue_today)}</div>
        </div>

        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-600">Obrót (łącznie)</div>
          <div className="text-2xl font-bold">{formatPrice(stats.revenue_total)}</div>
        </div>

        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-600">Produkty (łącznie)</div>
          <div className="text-2xl font-bold">{stats.products_total}</div>
        </div>

        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-600">Produkty aktywne</div>
          <div className="text-2xl font-bold">{stats.products_active}</div>
        </div>

        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-600">Niski stan (≤ 5)</div>
          <div className="text-2xl font-bold">{stats.low_stock}</div>
          <div className="text-xs text-gray-500 mt-1">
            Aktywne kategorie: {stats.categories_active}
          </div>
        </div>
      </div>

      {/* Ostatnie zamówienia */}
      <div className="bg-white rounded shadow mt-8 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Ostatnie zamówienia</h2>
          <Link href="/admin/orders" className="text-sm hover:underline">
            Zobacz wszystkie
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left p-3">ID</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Kwota</th>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Klient</th>
                <th className="text-right p-3">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="p-3">#{o.id}</td>
                  <td className="p-3">{statusLabel(o.status)}</td>
                  <td className="p-3">{formatPrice(o.total_amount)}</td>
                  <td className="p-3">{o.created_at ?? "-"}</td>
                  <td className="p-3">
                    <div className="font-medium">{o.customer_name ?? "-"}</div>
                    <div className="text-gray-600">{o.customer_email ?? "-"}</div>
                    {o.user && (
                      <div className="text-xs text-gray-500">
                        user: {o.user.name} ({o.user.email})
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="inline-block px-3 py-1 rounded border hover:bg-gray-50"
                    >
                      Szczegóły
                    </Link>
                  </td>
                </tr>
              ))}

              {recentOrders.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-gray-600" colSpan={6}>
                    Brak zamówień.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

AdminDashboard.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
