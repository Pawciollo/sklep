import React from "react";
import { router, usePage, Link } from "@inertiajs/react";
import AdminLayout from "@/layouts/admin-layout";

type OrderStatus = "pending" | "paid" | "shipped" | "cancelled" | "delivered";

type AdminOrderRow = {
  id: number;
  user_name: string | null;
  customer_email: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
};

type Filters = {
  status?: string | null;
  date_from?: string | null;
  date_to?: string | null;
};

type PageProps = {
  orders: AdminOrderRow[];
  filters?: Filters;

  sort?: string;
  dir?: "asc" | "desc";
};

function formatMoneyPLN(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(value);
}

function sortIcon(currentSort: string | undefined, currentDir: string | undefined, field: string) {
  if (currentSort !== field) return <span className="opacity-30">↕</span>;
  return currentDir === "asc" ? <span>↑</span> : <span>↓</span>;
}

export default function AdminOrdersIndex() {
  const { orders, filters: rawFilters, sort, dir } = usePage<PageProps>().props;

  const filters: Filters = rawFilters ?? {};

  function changeStatus(orderId: number, status: OrderStatus) {
    router.patch(`/admin/orders/${orderId}/status`, { status }, { preserveScroll: true });
  }

  function setFilter(next: Filters) {
    router.get("/admin/orders", next, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  }

  function cycleSort(field: string) {
    const currentSort = sort ?? "created_at";
    const currentDir = dir ?? "desc";

    let nextSort: string | null = field;
    let nextDir: "asc" | "desc" | null = "asc";

    if (currentSort !== field) {
      nextSort = field;
      nextDir = field === "created_at" ? "desc" : "asc";
    } else if (currentDir === "asc") {
      nextSort = field;
      nextDir = "desc";
    } else {
      nextSort = null;
      nextDir = null;
    }

    const params: Record<string, string> = {};

    if (filters.status) params.status = String(filters.status);
    if (filters.date_from) params.date_from = String(filters.date_from);
    if (filters.date_to) params.date_to = String(filters.date_to);

    if (nextSort && nextDir) {
      params.sort = nextSort;
      params.dir = nextDir;
    }

    router.get("/admin/orders", params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 text-gray-900">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Panel admina – zamówienia</h1>
        <Link href="/admin/products" className="text-sm hover:underline">
          ← Produkty
        </Link>
      </div>

      {/* FILTRY */}
      <form
        className="bg-white p-4 rounded border mb-6 flex flex-wrap gap-4 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setFilter(filters);
        }}
      >
        <div>
          <label className="block text-sm mb-1">Status</label>
          <select
            className="border rounded px-2 py-1"
            value={filters.status ?? ""}
            onChange={(e) => setFilter({ ...filters, status: e.target.value || null })}
          >
            <option value="">Wszystkie</option>
            <option value="pending">Oczekuje</option>
            <option value="paid">Opłacone</option>
            <option value="shipped">Wysłane</option>
            <option value="delivered">Dostarczone</option>
            <option value="cancelled">Anulowane</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Data od</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={filters.date_from ?? ""}
            onChange={(e) => setFilter({ ...filters, date_from: e.target.value || null })}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Data do</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={filters.date_to ?? ""}
            onChange={(e) => setFilter({ ...filters, date_to: e.target.value || null })}
          />
        </div>

        <button
          type="button"
          className="px-3 py-1 border rounded hover:bg-gray-100"
          onClick={() => router.get("/admin/orders", {}, { preserveState: true, preserveScroll: true })}
        >
          Reset
        </button>
      </form>

      {/* TABELA */}
      {orders.length === 0 ? (
        <p className="text-gray-700">Brak zamówień.</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-4 py-3">
                  <button type="button" className="inline-flex items-center gap-2" onClick={() => cycleSort("id")}>
                    ID {sortIcon(sort, dir, "id")}
                  </button>
                </th>

                <th className="text-left px-4 py-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2"
                    onClick={() => cycleSort("user_name")}
                  >
                    Użytkownik {sortIcon(sort, dir, "user_name")}
                  </button>
                </th>

                <th className="text-left px-4 py-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2"
                    onClick={() => cycleSort("customer_email")}
                  >
                    E-mail {sortIcon(sort, dir, "customer_email")}
                  </button>
                </th>

                <th className="text-left px-4 py-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2"
                    onClick={() => cycleSort("total_amount")}
                  >
                    Kwota {sortIcon(sort, dir, "total_amount")}
                  </button>
                </th>

                <th className="text-left px-4 py-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2"
                    onClick={() => cycleSort("created_at")}
                  >
                    Data {sortIcon(sort, dir, "created_at")}
                  </button>
                </th>

                <th className="text-left px-4 py-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2"
                    onClick={() => cycleSort("status")}
                  >
                    Status {sortIcon(sort, dir, "status")}
                  </button>
                </th>

                <th className="text-right px-4 py-3">Akcje</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-medium">#{o.id}</td>
                  <td className="px-4 py-3">{o.user_name ?? "— (gość)"}</td>
                  <td className="px-4 py-3">{o.customer_email}</td>
                  <td className="px-4 py-3">{formatMoneyPLN(o.total_amount)}</td>
                  <td className="px-4 py-3">{o.created_at}</td>

                  <td className="px-4 py-3">
                    <select
                      className="border rounded px-2 py-1"
                      value={o.status}
                      onChange={(e) => changeStatus(o.id, e.target.value as OrderStatus)}
                    >
                      <option value="pending">Oczekuje</option>
                      <option value="paid">Opłacone</option>
                      <option value="shipped">Wysłane</option>
                      <option value="delivered">Dostarczone</option>
                      <option value="cancelled">Anulowane</option>
                    </select>
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="inline-flex items-center px-3 py-1 border rounded hover:bg-gray-50"
                    >
                      Szczegóły
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

AdminOrdersIndex.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
