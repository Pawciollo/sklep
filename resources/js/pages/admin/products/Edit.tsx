import React, { useEffect, useState } from "react";
import { usePage, router } from "@inertiajs/react";
import AdminLayout from "@/layouts/admin-layout";

type Category = { id: number; name: string; slug: string };

type Product = {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  price: number; // grosze
  stock: number;
  active: boolean;
};

type Flash = { success?: string; error?: string };

type PageProps = {
  product: Product;
  categories: Category[];
  flash?: Flash;
  errors?: Record<string, string>;
};

export default function AdminProductsEdit() {
  const { product, categories, flash } = usePage<PageProps>().props;

  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (flash?.success) setNotice({ type: "success", text: flash.success });
    if (flash?.error) setNotice({ type: "error", text: flash.error });
  }, [flash?.success, flash?.error]);

  const [form, setForm] = useState({
    category_id: product.category_id,
    name: product.name,
    description: product.description ?? "",
    price: product.price,
    stock: product.stock,
    active: product.active,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);

    router.patch(`/admin/products/${product.id}`, form, {
      preserveScroll: true,
      onSuccess: () => setNotice({ type: "success", text: "Produkt zaktualizowany." }),
      onError: () => setNotice({ type: "error", text: "Nie udało się zapisać zmian." }),
    });
  }

  return (
    <div className="text-gray-900 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edytuj produkt #{product.id}</h1>
        <a href="/admin/products" className="text-sm hover:underline">← Wróć do listy</a>
      </div>

      {notice && (
        <div className={`border rounded px-4 py-3 ${notice.type === "success" ? "bg-green-50" : "bg-red-50"}`}>
          {notice.text}
        </div>
      )}

      <div className="bg-white border rounded shadow-sm p-4">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            Kategoria
            <select
              className="mt-1 w-full border rounded px-2 py-1"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Nazwa
            <input
              className="mt-1 w-full border rounded px-2 py-1"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>

          <label className="text-sm md:col-span-2">
            Opis
            <textarea
              className="mt-1 w-full border rounded px-2 py-1"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <label className="text-sm">
            Cena (grosze)
            <input
              type="number"
              className="mt-1 w-full border rounded px-2 py-1"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
          </label>

          <label className="text-sm">
            Stan (stock)
            <input
              type="number"
              className="mt-1 w-full border rounded px-2 py-1"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
            />
          </label>

          <label className="text-sm flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Aktywny
          </label>

          <button className="md:col-span-2 bg-gray-900 text-white rounded px-4 py-2">
            Zapisz zmiany
          </button>
        </form>
      </div>
    </div>
  );
}

AdminProductsEdit.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
