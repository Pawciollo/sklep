import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import AdminLayout from "@/layouts/admin-layout";

type Subcategory = {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  active: boolean;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  subcategories?: Subcategory[];
};

type Flash = { success?: string; error?: string };

type PageProps = {
  categories: Category[];
  flash?: Flash;
  errors?: Record<string, string>;
};

type Filters = {
  category_id?: number | null;
};

function readFiltersFromUrl(): Filters {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const category = sp.get("category_id");
  return { category_id: category ? Number(category) : null };
}

export default function AdminCategoriesIndex() {
  const { categories, flash, errors } = usePage<PageProps>().props;

  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (flash?.success) setNotice({ type: "success", text: flash.success });
    if (flash?.error) setNotice({ type: "error", text: flash.error });
  }, [flash?.success, flash?.error]);

  // =========================
  // FILTRY (jak w products)
  // =========================
  const [filters, setFilters] = useState<Filters>(readFiltersFromUrl());

  function applyFilters(next: Filters) {
    setFilters(next);

    const params: Record<string, string> = {};
    if (next.category_id) params.category_id = String(next.category_id);

    router.get("/admin/categories", params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  }

  function resetFilters() {
    setFilters({ category_id: null });

    router.get("/admin/categories", {}, { preserveState: true, preserveScroll: true, replace: true });
  }

  const filteredCategories = useMemo(() => {
    if (!filters.category_id) return categories;
    return categories.filter((c) => c.id === filters.category_id);
  }, [categories, filters.category_id]);

  // =========================
  // KATEGORIE — dodawanie
  // =========================
  const [createForm, setCreateForm] = useState<{ name: string; active: boolean }>({
    name: "",
    active: true,
  });

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);

    router.post(
      "/admin/categories",
      { name: createForm.name, active: createForm.active },
      {
        preserveScroll: true,
        onSuccess: () => setCreateForm({ name: "", active: true }),
      }
    );
  }

  // =========================
  // KATEGORIE — edycja INLINE
  // =========================
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState<{ name: string; active: boolean }>({
    name: "",
    active: true,
  });

  function startEditCategory(c: Category) {
    setNotice(null);
    setEditingCategoryId(c.id);
    setEditCategoryForm({ name: c.name, active: c.active });
    // zamknij ewentualną edycję podkategorii, żeby UI nie wariował
    setEditingSubId(null);
  }

  function cancelEditCategory() {
    setEditingCategoryId(null);
  }

  function saveEditCategory(e: React.FormEvent) {
    e.preventDefault();
    if (editingCategoryId == null) return;

    router.patch(
      `/admin/categories/${editingCategoryId}`,
      { name: editCategoryForm.name, active: editCategoryForm.active },
      { preserveScroll: true, onSuccess: () => setEditingCategoryId(null) }
    );
  }

  function deleteCategory(c: Category) {
    if (!confirm(`Na pewno usunąć kategorię: "${c.name}"?`)) return;
    setNotice(null);
    router.delete(`/admin/categories/${c.id}`, { preserveScroll: true });
  }

  function toggleCategoryActive(c: Category) {
    setNotice(null);
    router.patch(`/admin/categories/${c.id}`, { name: c.name, active: !c.active }, { preserveScroll: true });
  }

  // =========================
  // PODKATEGORIE — dodawanie
  // =========================
  const [subCreateByCategory, setSubCreateByCategory] = useState<Record<number, { name: string; active: boolean }>>({});

  function setSubCreateField(categoryId: number, patch: Partial<{ name: string; active: boolean }>) {
    setSubCreateByCategory((prev) => {
      const current = prev[categoryId] ?? { name: "", active: true };
      return { ...prev, [categoryId]: { ...current, ...patch } };
    });
  }

  function submitCreateSub(e: React.FormEvent, categoryId: number) {
    e.preventDefault();
    setNotice(null);

    const payload = subCreateByCategory[categoryId] ?? { name: "", active: true };

    router.post(
      `/admin/categories/${categoryId}/subcategories`,
      { name: payload.name, active: payload.active },
      {
        preserveScroll: true,
        onSuccess: () => {
          setSubCreateByCategory((prev) => ({ ...prev, [categoryId]: { name: "", active: true } }));
        },
      }
    );
  }

  // =========================
  // PODKATEGORIE — edycja INLINE
  // =========================
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [editSubForm, setEditSubForm] = useState<{ name: string; active: boolean; category_id: number }>({
    name: "",
    active: true,
    category_id: 0,
  });

  function startEditSub(s: Subcategory, parentCategoryId: number) {
    setNotice(null);
    setEditingSubId(s.id);

    // ważne: category_id musi być wysyłane, żeby nie wyskakiwało "category id field is required"
    const category_id = typeof s.category_id === "number" ? s.category_id : parentCategoryId;

    setEditSubForm({
      name: s.name,
      active: s.active,
      category_id,
    });

    // zamknij ewentualną edycję kategorii
    setEditingCategoryId(null);
  }

  function cancelEditSub() {
    setEditingSubId(null);
  }

  function saveEditSub(e: React.FormEvent) {
    e.preventDefault();
    if (editingSubId == null) return;

    router.patch(
      `/admin/subcategories/${editingSubId}`,
      {
        category_id: editSubForm.category_id,
        name: editSubForm.name,
        active: editSubForm.active,
      },
      {
        preserveScroll: true,
        onSuccess: () => setEditingSubId(null),
      }
    );
  }

  function deleteSubcategory(s: Subcategory) {
    if (!confirm(`Na pewno usunąć podkategorię: "${s.name}"?`)) return;
    setNotice(null);
    router.delete(`/admin/subcategories/${s.id}`, { preserveScroll: true });
  }

  function toggleSubActive(s: Subcategory, parentCategoryId: number) {
    const category_id = typeof s.category_id === "number" ? s.category_id : parentCategoryId;
    setNotice(null);

    router.patch(`/admin/subcategories/${s.id}`, { name: s.name, active: !s.active, category_id }, { preserveScroll: true });
  }

  // szybki lookup (używany w edycji podkategorii)
  const categoriesById = useMemo(() => {
    const map = new Map<number, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin – Kategorie</h1>

      {notice && (
        <div
          className={`mb-4 rounded border px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {notice.text}
        </div>
      )}

      {errors && Object.keys(errors).length > 0 && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="font-semibold mb-2">Błędy:</div>
          <ul className="list-disc pl-5 space-y-1">
            {Object.entries(errors).map(([k, v]) => (
              <li key={k}>
                <span className="font-mono">{k}</span>: {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dodawanie kategorii */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <h2 className="font-semibold mb-3">Dodaj kategorię</h2>

        <form onSubmit={submitCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-700 mb-1">Nazwa</label>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Np. Suplementy"
              value={createForm.name}
              onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm mb-1 sm:mb-0 select-none">
            <input
              type="checkbox"
              checked={createForm.active}
              onChange={(e) => setCreateForm((p) => ({ ...p, active: e.target.checked }))}
            />
            Aktywna
          </label>

          <button className="px-4 py-2 rounded bg-black text-white">Dodaj</button>
        </form>
      </div>

      {/* ===== FILTR (jak w products) ===== */}
      <form
        className="bg-white p-4 rounded border mb-6 flex flex-wrap gap-4 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters(filters);
        }}
      >
        <div>
          <label className="block text-sm mb-1">Kategoria</label>
          <select
            className="border rounded px-2 py-1"
            value={filters.category_id ?? ""}
            onChange={(e) => {
              const cat = e.target.value ? Number(e.target.value) : null;
              applyFilters({ category_id: cat });
            }}
          >
            <option value="">Wszystkie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="px-3 py-1 border rounded hover:bg-gray-100" onClick={resetFilters}>
          Reset
        </button>
      </form>

      {/* Lista kategorii */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-4 py-3 w-[90px]">ID</th>
                <th className="px-4 py-3">Nazwa</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3 w-[120px]">Aktywna</th>
                <th className="px-4 py-3 w-[220px] text-right">Akcje</th>
              </tr>
            </thead>

            <tbody>
              {filteredCategories.map((c, idx) => {
                const isEditingCategory = editingCategoryId === c.id;

                return (
                  <React.Fragment key={c.id}>
                    {/* wiersz kategorii */}
                    <tr className="border-t">
                      <td className="px-4 py-3 font-mono">#{c.id}</td>
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.slug}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                            c.active
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-gray-50 text-gray-600 border border-gray-200"
                          }`}
                        >
                          {c.active ? "TAK" : "NIE"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="px-3 py-1.5 rounded border hover:bg-gray-50"
                            onClick={() => toggleCategoryActive(c)}
                            type="button"
                          >
                            Przełącz aktywność
                          </button>

                          <button
                            className="px-3 py-1.5 rounded border hover:bg-gray-50"
                            onClick={() => startEditCategory(c)}
                            type="button"
                          >
                            Edytuj
                          </button>

                          <button
                            className="px-3 py-1.5 rounded border text-red-600 hover:bg-red-50"
                            onClick={() => deleteCategory(c)}
                            type="button"
                          >
                            Usuń
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* edycja kategorii INLINE (pod wierszem) */}
                    {isEditingCategory && (
                      <tr className="border-t bg-gray-50/60">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-semibold">
                              Edytuj kategorię: <span className="font-bold">{c.name}</span>
                            </div>
                            <button
                              className="text-sm text-gray-600 hover:underline"
                              type="button"
                              onClick={cancelEditCategory}
                            >
                              Anuluj
                            </button>
                          </div>

                          <form onSubmit={saveEditCategory} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="flex-1">
                              <label className="block text-sm text-gray-700 mb-1">Nazwa</label>
                              <input
                                className="w-full border rounded px-3 py-2"
                                value={editCategoryForm.name}
                                onChange={(e) => setEditCategoryForm((p) => ({ ...p, name: e.target.value }))}
                                required
                              />
                            </div>

                            <label className="flex items-center gap-2 text-sm mb-1 sm:mb-0 select-none">
                              <input
                                type="checkbox"
                                checked={editCategoryForm.active}
                                onChange={(e) => setEditCategoryForm((p) => ({ ...p, active: e.target.checked }))}
                              />
                              Aktywna
                            </label>

                            <button className="px-4 py-2 rounded bg-black text-white">Zapisz</button>
                          </form>
                        </td>
                      </tr>
                    )}

                    {/* dodawanie podkategorii */}
                    <tr className="border-t">
                      <td colSpan={5} className="px-4 py-3 bg-white">
                        <form
                          onSubmit={(e) => submitCreateSub(e, c.id)}
                          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="text-sm text-gray-700">
                            <span className="font-semibold">Dodaj podkategorię</span> do:{" "}
                            <span className="font-medium">{c.name}</span>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                            <input
                              className="border rounded px-3 py-2 w-full sm:w-64"
                              placeholder="Np. Kreatyna"
                              value={subCreateByCategory[c.id]?.name ?? ""}
                              onChange={(e) => setSubCreateField(c.id, { name: e.target.value })}
                              required
                            />

                            <label className="flex items-center gap-2 text-sm select-none">
                              <input
                                type="checkbox"
                                checked={subCreateByCategory[c.id]?.active ?? true}
                                onChange={(e) => setSubCreateField(c.id, { active: e.target.checked })}
                              />
                              Aktywna
                            </label>

                            <button className="px-4 py-2 rounded bg-black text-white">Dodaj</button>
                          </div>
                        </form>
                      </td>
                    </tr>

                    {/* lista podkategorii */}
                    {(c.subcategories ?? []).map((s) => {
                      const isEditingSub = editingSubId === s.id;

                      return (
                        <React.Fragment key={s.id}>
                          <tr className="border-t bg-gray-50/30">
                            <td className="px-4 py-3 text-gray-500 font-mono">
                              <span className="inline-flex items-center gap-2">
                                <span className="text-gray-400">↳</span>#{s.id}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-gray-500">Podkategoria</div>
                            </td>

                            <td className="px-4 py-3 text-gray-600">{s.slug}</td>

                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                                  s.active
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "bg-gray-50 text-gray-600 border border-gray-200"
                                }`}
                              >
                                {s.active ? "TAK" : "NIE"}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  className="px-3 py-1.5 rounded border hover:bg-gray-50"
                                  onClick={() => toggleSubActive(s, c.id)}
                                  type="button"
                                >
                                  Przełącz aktywność
                                </button>

                                <button
                                  className="px-3 py-1.5 rounded border hover:bg-gray-50"
                                  onClick={() => startEditSub(s, c.id)}
                                  type="button"
                                >
                                  Edytuj
                                </button>

                                <button
                                  className="px-3 py-1.5 rounded border text-red-600 hover:bg-red-50"
                                  onClick={() => deleteSubcategory(s)}
                                  type="button"
                                >
                                  Usuń
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* edycja podkategorii INLINE */}
                          {isEditingSub && (
                            <tr className="border-t bg-gray-50">
                              <td colSpan={5} className="px-4 py-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="font-semibold">
                                    Edytuj podkategorię: <span className="font-bold">{s.name}</span>{" "}
                                    <span className="text-gray-500 font-normal">
                                      (w kategorii: {categoriesById.get(editSubForm.category_id)?.name ?? c.name})
                                    </span>
                                  </div>
                                  <button
                                    className="text-sm text-gray-600 hover:underline"
                                    type="button"
                                    onClick={cancelEditSub}
                                  >
                                    Anuluj
                                  </button>
                                </div>

                                <form onSubmit={saveEditSub} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                  <div className="flex-1">
                                    <label className="block text-sm text-gray-700 mb-1">Nazwa</label>
                                    <input
                                      className="w-full border rounded px-3 py-2"
                                      value={editSubForm.name}
                                      onChange={(e) => setEditSubForm((p) => ({ ...p, name: e.target.value }))}
                                      required
                                    />
                                  </div>

                                  <label className="flex items-center gap-2 text-sm mb-1 sm:mb-0 select-none">
                                    <input
                                      type="checkbox"
                                      checked={editSubForm.active}
                                      onChange={(e) => setEditSubForm((p) => ({ ...p, active: e.target.checked }))}
                                    />
                                    Aktywna
                                  </label>

                                  <button className="px-4 py-2 rounded bg-black text-white">Zapisz</button>
                                </form>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {/* separator między kategoriami */}
                    {idx !== filteredCategories.length - 1 && (
                      <tr className="border-t">
                        <td colSpan={5} className="p-0">
                          <div className="h-4 bg-gray-100" />
                          <div className="h-px bg-gray-200" />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

AdminCategoriesIndex.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
