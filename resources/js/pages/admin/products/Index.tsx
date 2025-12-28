import React, { useEffect, useMemo, useState } from "react";
import { usePage, router } from "@inertiajs/react";
import AdminLayout from "@/layouts/admin-layout";

type Category = { id: number; name: string; slug: string };

type Subcategory = {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  active: boolean;
};

type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number; // grosze
  stock: number;
  active: boolean;
  category_id: number;
  subcategory_id?: number | null;
  category?: Category;
  subcategory?: Subcategory | null;
  images?: string[] | null;
};

type Flash = { success?: string; error?: string };

type Filters = {
  category_id?: number | null;
  subcategory_id?: number | null;
};

type PageProps = {
  products: Product[];
  categories: Category[];
  subcategories: Subcategory[];
  flash?: Flash;
  errors?: Record<string, string>;
  sort?: string | null;
  dir?: "asc" | "desc" | null;
  filters?: Filters; // <-- dodane (backend powinien to zwracać)
};

type ProductUpdatePayload = {
  category_id: number;
  subcategory_id: number | null;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  active: boolean;

  images?: File[];
  existing_images?: string[];
};

type PageWithLayout = React.FC & {
  layout?: (page: React.ReactNode) => React.ReactElement;
};

function money(cents: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format((cents ?? 0) / 100);
}

function sortIcon(currentSort: string | null | undefined, currentDir: string | null | undefined, field: string) {
  if (currentSort !== field) return <span className="opacity-30">↕</span>;
  return currentDir === "asc" ? <span>↑</span> : <span>↓</span>;
}

function imageUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/storage/")) return path;
  if (path.startsWith("storage/")) return "/" + path;
  return `/storage/${path.replace(/^\/+/, "")}`;
}

// ===== helpers: zł/gr <-> grosze =====
function splitPrice(cents: number) {
  const safe = Number.isFinite(cents) ? Math.max(0, Math.trunc(cents)) : 0;
  return { zl: Math.floor(safe / 100), gr: safe % 100 };
}
function clampInt(n: number, min: number, max: number) {
  const x = Number.isFinite(n) ? Math.trunc(n) : 0;
  return Math.min(max, Math.max(min, x));
}
function buildPrice(zl: number, gr: number) {
  const zlSafe = clampInt(zl, 0, Number.MAX_SAFE_INTEGER);
  const grSafe = clampInt(gr, 0, 99);
  return zlSafe * 100 + grSafe;
}

function moveItem<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return arr;
  if (fromIndex < 0 || fromIndex >= arr.length) return arr;
  if (toIndex < 0 || toIndex >= arr.length) return arr;

  const next = [...arr];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function PriceInputs(props: {
  zl: number;
  gr: number;
  onZlChange: (zl: number) => void;
  onGrChange: (gr: number) => void;
}) {
  return (
    <div className="mt-1 grid grid-cols-2 gap-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          className="w-full border rounded px-3 py-2"
          value={props.zl}
          onChange={(e) => props.onZlChange(Number(e.target.value))}
        />
        <span className="text-xs text-gray-600 whitespace-nowrap">zł</span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={99}
          className="w-full border rounded px-3 py-2"
          value={props.gr}
          onChange={(e) => props.onGrChange(Number(e.target.value))}
        />
        <span className="text-xs text-gray-600 whitespace-nowrap">gr</span>
      </div>
    </div>
  );
}

function readFiltersFromUrl(): Filters {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const category = sp.get("category_id");
  const subcategory = sp.get("subcategory_id");
  return {
    category_id: category ? Number(category) : null,
    subcategory_id: subcategory ? Number(subcategory) : null,
  };
}

const AdminProductsIndex: PageWithLayout = () => {
  const { products, categories, subcategories, flash, errors, sort, dir, filters: serverFilters } =
    usePage<PageProps>().props;

  // filtry: preferujemy backend props, ale jeśli ich nie ma (na start), czytamy z URL
  const initialFilters: Filters = serverFilters ?? readFiltersFromUrl();

  const [filters, setFilters] = useState<Filters>(initialFilters);

  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (flash?.success) setNotice({ type: "success", text: flash.success });
    if (flash?.error) setNotice({ type: "error", text: flash.error });
  }, [flash?.success, flash?.error]);

  // jeśli backend zwróci filtry (np. po nawigacji), synchronizujemy
  useEffect(() => {
    if (!serverFilters) return;
    setFilters(serverFilters);
  }, [serverFilters?.category_id, serverFilters?.subcategory_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeSubcategoriesByCategory = useMemo(() => {
    const map = new Map<number, Subcategory[]>();
    for (const s of subcategories) {
      if (!s.active) continue;
      const arr = map.get(s.category_id) ?? [];
      arr.push(s);
      map.set(s.category_id, arr);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
      map.set(k, arr);
    }
    return map;
  }, [subcategories]);

  function buildQueryParams(
    nextFilters?: Filters,
    nextSort?: string | null,
    nextDir?: "asc" | "desc" | null
  ) {
    const params: Record<string, string> = {};

    const f = nextFilters ?? filters;

    if (f.category_id) params.category_id = String(f.category_id);
    if (f.subcategory_id) params.subcategory_id = String(f.subcategory_id);

    // 1) jeśli jawnie przekazaliśmy sortowanie
    if (typeof nextSort === "string" && (nextDir === "asc" || nextDir === "desc")) {
      params.sort = nextSort;
      params.dir = nextDir;
      return params;
    }

    // 2) jeśli jawnie robimy reset sortowania (3 klik)
    if (nextSort === null && nextDir === null) {
      return params;
    }

    // 3) w pozostałych przypadkach (np. filtrowanie) zachowaj obecne sortowanie, jeśli istnieje
    if (sort && dir) {
      params.sort = String(sort);
      params.dir = String(dir);
    }

    return params;
  }

  function applyFilters(next: Filters) {
    setFilters(next);

    router.get("/admin/products", buildQueryParams(next), {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  }

  function resetFilters() {
    setFilters({ category_id: null, subcategory_id: null });

    router.get("/admin/products", {}, { preserveState: true, preserveScroll: true, replace: true });
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

    router.get("/admin/products", buildQueryParams(filters, nextSort, nextDir), {
      preserveScroll: true,
      preserveState: true,
      replace: true,
    });
  }

  // ===== DODAWANIE =====
  const [form, setForm] = useState({
    category_id: categories[0]?.id ?? 1,
    subcategory_id: null as number | null,
    name: "",
    description: "",
    price: 0, // grosze
    stock: 0,
    imagesFiles: [] as File[],
    active: true,
  });

  useEffect(() => {
    setForm((prev) => ({ ...prev, subcategory_id: null }));
  }, [form.category_id]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);

    const payload = {
      category_id: form.category_id,
      subcategory_id: form.subcategory_id,
      name: form.name,
      description: form.description,
      price: form.price,
      stock: form.stock,
      active: form.active,
      images: form.imagesFiles,
    };

    router.post("/admin/products", payload, {
      preserveScroll: true,
      forceFormData: true,
      onSuccess: () => {
        setNotice({ type: "success", text: "Produkt dodany." });
        setForm({
          category_id: categories[0]?.id ?? 1,
          subcategory_id: null,
          name: "",
          description: "",
          price: 0,
          stock: 0,
          imagesFiles: [],
          active: true,
        });
      },
      onError: () => setNotice({ type: "error", text: "Nie udało się dodać produktu. Sprawdź formularz." }),
    });
  }

  // ===== EDYCJA INLINE =====
  const [editing, setEditing] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    category_id: categories[0]?.id ?? 1,
    subcategory_id: null as number | null,
    name: "",
    description: "",
    price: 0, // grosze
    stock: 0,
    imagesFiles: [] as File[],
    existingImages: [] as string[],
    active: true,
  });

  function startEdit(p: Product) {
    setNotice(null);
    setEditing(p);

    const existing = (p.images ?? []).filter((x): x is string => typeof x === "string" && x.trim().length > 0);

    setEditForm({
      category_id: p.category_id,
      subcategory_id: p.subcategory_id ?? null,
      name: p.name ?? "",
      description: p.description ?? "",
      price: Number(p.price ?? 0),
      stock: Number(p.stock ?? 0),
      imagesFiles: [],
      existingImages: existing,
      active: Boolean(p.active),
    });
  }

  function cancelEdit() {
    setEditing(null);
  }

  useEffect(() => {
    if (!editing) return;
    setEditForm((prev) => ({ ...prev, subcategory_id: null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm.category_id]);

  function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    const payload: ProductUpdatePayload & { _method: "PATCH" } = {
      category_id: editForm.category_id,
      subcategory_id: editForm.subcategory_id,
      name: editForm.name,
      description: editForm.description,
      price: editForm.price,
      stock: editForm.stock,
      active: editForm.active,
      existing_images: editForm.existingImages,
      _method: "PATCH",
    };

    // UWAGA: jeśli nie wybierzesz nowych plików, kontroler zostawi stare images
    if (editForm.imagesFiles.length > 0) {
      payload.images = editForm.imagesFiles;
    }

    router.post(`/admin/products/${editing.id}`, payload, {
      preserveScroll: true,
      forceFormData: true,
      onSuccess: () => {
        setNotice({ type: "success", text: "Produkt zaktualizowany." });
        setEditing(null);
      },
      onError: () => setNotice({ type: "error", text: "Nie udało się zapisać zmian." }),
    });
  }

  function remove(p: Product) {
    if (!confirm(`Usunąć produkt: ${p.name}?`)) return;
    router.delete(`/admin/products/${p.id}`, { preserveScroll: true });
  }

  const formSubs = activeSubcategoriesByCategory.get(form.category_id) ?? [];
  const editSubs = activeSubcategoriesByCategory.get(editForm.category_id) ?? [];

  const { zl: formZl, gr: formGr } = splitPrice(form.price);
  const { zl: editZl, gr: editGr } = splitPrice(editForm.price);

  const filterSubs = filters.category_id ? activeSubcategoriesByCategory.get(filters.category_id) ?? [] : [];

  return (
    <div className="text-gray-900 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin – Produkty</h1>
      </div>

      {notice && (
        <div
          className={`border rounded px-4 py-3 ${
            notice.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {notice.text}
        </div>
      )}

      {errors && Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded px-4 py-3 text-sm">
          <div className="font-semibold mb-1">Błędy:</div>
          <ul className="list-disc pl-5">
            {Object.entries(errors).map(([k, v]) => (
              <li key={k}>
                {k}: {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ===== FORM DODAWANIA ===== */}
      <div className="bg-white rounded border shadow-sm p-4">
        <h2 className="font-semibold mb-3">Dodaj produkt</h2>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div>
              <label className="text-sm font-medium">Kategoria</label>
              <select
                className="mt-1 w-full border rounded px-3 py-2"
                value={form.category_id}
                onChange={(e) => setForm((p) => ({ ...p, category_id: Number(e.target.value) }))}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Podkategoria</label>
              <select
                className="mt-1 w-full border rounded px-3 py-2"
                value={form.subcategory_id ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, subcategory_id: e.target.value ? Number(e.target.value) : null }))
                }
              >
                <option value="">— brak —</option>
                {formSubs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Nazwa</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Opis</label>
            <textarea
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div>
              <label className="text-sm font-medium">Cena</label>
              <PriceInputs
                zl={formZl}
                gr={formGr}
                onZlChange={(zl) =>
                  setForm((p) => {
                    const { gr } = splitPrice(p.price);
                    return { ...p, price: buildPrice(zl, gr) };
                  })
                }
                onGrChange={(gr) =>
                  setForm((p) => {
                    const { zl } = splitPrice(p.price);
                    return { ...p, price: buildPrice(zl, gr) };
                  })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium">Stan (stock)</label>
              <input
                type="number"
                min={0}
                className="mt-1 w-full border rounded px-3 py-2"
                value={form.stock}
                onChange={(e) => setForm((p) => ({ ...p, stock: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Zdjęcia</label>
            <input
                id="product-images"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setForm((p) => ({ ...p, imagesFiles: Array.from(e.target.files ?? []) }))}
                />

                <label
                htmlFor="product-images"
                className="mt-1 inline-flex items-center justify-center w-full border rounded px-3 py-2 bg-white cursor-pointer hover:bg-gray-50 text-sm text-gray-700"
                >
                Wybierz zdjęcia do przesłania
            </label>
            {form.imagesFiles.length > 0 && (
              <div className="text-xs text-gray-600 mt-1">Wybrano: {form.imagesFiles.length} plik(ów)</div>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
            />
            Aktywny
          </label>

          <button className="w-full bg-slate-900 text-white rounded py-2 font-semibold">Dodaj</button>
        </form>
      </div>

      {/* ===== FILTRY (jak w zamówieniach) ===== */}
      <form
        className="bg-white p-4 rounded border flex flex-wrap gap-4 items-end"
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
              // zmiana kategorii => reset podkategorii
              applyFilters({ category_id: cat, subcategory_id: null });
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

        <div>
          <label className="block text-sm mb-1">Podkategoria</label>
          <select
            className="border rounded px-2 py-1"
            value={filters.subcategory_id ?? ""}
            disabled={!filters.category_id}
            onChange={(e) => {
              const sub = e.target.value ? Number(e.target.value) : null;
              applyFilters({ ...filters, subcategory_id: sub });
            }}
          >
            <option value="">{filters.category_id ? "Wszystkie" : "Najpierw wybierz kategorię"}</option>
            {filterSubs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="px-3 py-1 border rounded hover:bg-gray-100" onClick={resetFilters}>
          Reset
        </button>
      </form>

      {/* ===== TABELA ===== */}
      <div className="bg-white rounded border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left px-4 py-3">
                <button type="button" className="inline-flex items-center gap-2" onClick={() => cycleSort("id")}>
                  ID {sortIcon(sort, dir, "id")}
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button type="button" className="inline-flex items-center gap-2" onClick={() => cycleSort("name")}>
                  Nazwa {sortIcon(sort, dir, "name")}
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button type="button" className="inline-flex items-center gap-2" onClick={() => cycleSort("category")}>
                  Kategoria {sortIcon(sort, dir, "category")}
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2"
                  onClick={() => cycleSort("subcategory")}
                >
                  Podkategoria {sortIcon(sort, dir, "subcategory")}
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button type="button" className="inline-flex items-center gap-2" onClick={() => cycleSort("price")}>
                  Cena {sortIcon(sort, dir, "price")}
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button type="button" className="inline-flex items-center gap-2" onClick={() => cycleSort("stock")}>
                  Stock {sortIcon(sort, dir, "stock")}
                </button>
              </th>
              <th className="text-left px-4 py-3">Zdjęcia</th>
              <th className="text-left px-4 py-3">
                <button type="button" className="inline-flex items-center gap-2" onClick={() => cycleSort("active")}>
                  Aktywny {sortIcon(sort, dir, "active")}
                </button>
              </th>
              <th className="text-left px-4 py-3">Akcje</th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => {
              const isEditing = editing?.id === p.id;

              return (
                <React.Fragment key={p.id}>
                  <tr className="border-t">
                    <td className="px-4 py-3 align-top">#{p.id}</td>
                    <td className="px-4 py-3 align-top font-medium">{p.name}</td>
                    <td className="px-4 py-3 align-top">{p.category?.name ?? "—"}</td>
                    <td className="px-4 py-3 align-top">{p.subcategory?.name ?? "—"}</td>
                    <td className="px-4 py-3 align-top">{money(p.price)}</td>
                    <td className="px-4 py-3 align-top">{p.stock}</td>
                    <td className="px-4 py-3 align-top">{(p.images ?? []).length}</td>
                    <td className="px-4 py-3 align-top">{p.active ? "TAK" : "NIE"}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex gap-2 justify-end">
                        <button type="button" className="border rounded px-3 py-1" onClick={() => startEdit(p)}>
                          Edytuj
                        </button>
                        <button type="button" className="border rounded px-3 py-1 text-red-700" onClick={() => remove(p)}>
                          Usuń
                        </button>
                      </div>
                    </td>
                  </tr>

                  {isEditing && (
                    <tr className="border-t bg-gray-50">
                      <td colSpan={9} className="px-4 py-4">
                        <form onSubmit={saveEdit} className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                            <div>
                              <label className="text-sm font-medium">Kategoria</label>
                              <select
                                className="mt-1 w-full border rounded px-3 py-2"
                                value={editForm.category_id}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, category_id: Number(e.target.value) }))
                                }
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-sm font-medium">Podkategoria</label>
                              <select
                                className="mt-1 w-full border rounded px-3 py-2"
                                value={editForm.subcategory_id ?? ""}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    subcategory_id: e.target.value ? Number(e.target.value) : null,
                                  }))
                                }
                              >
                                <option value="">— brak —</option>
                                {editSubs.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Nazwa</label>
                            <input
                              className="mt-1 w-full border rounded px-3 py-2"
                              value={editForm.name}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium">Opis</label>
                            <textarea
                              className="mt-1 w-full border rounded px-3 py-2"
                              value={editForm.description}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                            <div>
                              <label className="text-sm font-medium">Cena</label>
                              <PriceInputs
                                zl={editZl}
                                gr={editGr}
                                onZlChange={(zl) =>
                                  setEditForm((prev) => {
                                    const { gr } = splitPrice(prev.price);
                                    return { ...prev, price: buildPrice(zl, gr) };
                                  })
                                }
                                onGrChange={(gr) =>
                                  setEditForm((prev) => {
                                    const { zl } = splitPrice(prev.price);
                                    return { ...prev, price: buildPrice(zl, gr) };
                                  })
                                }
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium">Stan (stock)</label>
                              <input
                                type="number"
                                min={0}
                                className="mt-1 w-full border rounded px-3 py-2"
                                value={editForm.stock}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, stock: Number(e.target.value) }))}
                              />
                            </div>
                          </div>

                          <label className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={editForm.active}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, active: e.target.checked }))}
                            />
                            Aktywny
                          </label>

                          <div>
                            <label className="text-sm font-medium">Zdjęcia (aktualne)</label>
                            <div className="text-xs text-gray-600 mb-2">
                              Aktualnie: {editForm.existingImages.length} szt.
                            </div>

                            {editForm.existingImages.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {editForm.existingImages.map((path, index) => {
                                    const url = imageUrl(path);
                                    const canLeft = index > 0;
                                    const canRight = index < editForm.existingImages.length - 1;

                                    return (
                                        <div key={path} className="border rounded p-1 bg-white">
                                        <img src={url} alt="" className="w-16 h-16 object-cover rounded block" />

                                        <div className="mt-1 space-y-1">
                                            <div className="grid grid-cols-2 gap-1">
                                                <button
                                                type="button"
                                                className="text-xs border rounded px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                                                disabled={!canLeft}
                                                onClick={() =>
                                                    setEditForm((prev) => ({
                                                    ...prev,
                                                    existingImages: moveItem(prev.existingImages, index, index - 1),
                                                    }))
                                                }
                                                title="Przesuń w lewo"
                                                >
                                                ←
                                                </button>

                                                <button
                                                type="button"
                                                className="text-xs border rounded px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                                                disabled={!canRight}
                                                onClick={() =>
                                                    setEditForm((prev) => ({
                                                    ...prev,
                                                    existingImages: moveItem(prev.existingImages, index, index + 1),
                                                    }))
                                                }
                                                title="Przesuń w prawo"
                                                >
                                                →
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                className="w-full text-xs border rounded px-2 py-1 text-red-700 hover:bg-red-50"
                                                onClick={() =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    existingImages: prev.existingImages.filter((p2) => p2 !== path),
                                                }))
                                                }
                                                title="Usuń zdjęcie"
                                            >
                                                Usuń
                                            </button>
                                            </div>
                                        </div>
                                    );
                                })}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="text-sm font-medium">Dodaj nowe zdjęcia</label>

                            <input
                                id={`edit-product-images-${editing?.id ?? "x"}`}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) =>
                                setEditForm((p2) => ({ ...p2, imagesFiles: Array.from(e.target.files ?? []) }))
                                }
                            />

                            <label
                                htmlFor={`edit-product-images-${editing?.id ?? "x"}`}
                                className="mt-1 inline-flex items-center justify-center w-full border rounded px-3 py-2 bg-white cursor-pointer hover:bg-gray-50 text-sm text-gray-700"
                            >
                                Wybierz zdjęcia do przesłania
                            </label>

                            {editForm.imagesFiles.length > 0 && (
                                <div className="text-xs text-gray-600 mt-1">
                                Wybrano do dodania: {editForm.imagesFiles.length} plik(ów)
                                </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button className="bg-slate-900 text-white rounded px-4 py-2 font-semibold">Zapisz</button>
                            <button type="button" className="border rounded px-4 py-2" onClick={cancelEdit}>
                              Anuluj
                            </button>
                          </div>
                        </form>
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
  );
};

AdminProductsIndex.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;

export default AdminProductsIndex;
