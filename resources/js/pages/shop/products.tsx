import React, { useEffect, useMemo, useState } from "react";
import { Head, Link } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";

type Subcategory = {
  id: number;
  category_id: number;
  name: string;
  slug: string;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  subcategories?: Subcategory[];
};

type Product = {
  id: number;
  name: string;
  slug: string;
  price: number; // grosze
  images: string[] | null;
  category: Category;
  subcategory?: Subcategory | null;
  stock: number;

  // opcjonalnie (jeśli kiedyś dodasz w API liczniki popularności)
  sold_count?: number | string | null;
  orders_count?: number | string | null;
  popularity?: number | string | null;
};

type ProductsResponse = {
  data: Product[];
  current_page: number;
  last_page: number;
};

type InertiaPage = React.FC & {
  layout?: (page: React.ReactNode) => React.ReactNode;
};

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2) + " zł";
}

function imageUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/storage/")) return path;
  if (path.startsWith("storage/")) return "/" + path;
  return `/storage/${path.replace(/^\/+/, "")}`;
}

// ✅ dodaliśmy popular
type SortOption = "default" | "popular" | "price_asc" | "price_desc";

type QueryState = {
  category: string | null;
  subcategory: string | null;
  search: string;
  sort: SortOption;
};

function readQuery(): QueryState {
  const params = new URLSearchParams(window.location.search);

  const category = params.get("category");
  const subcategory = params.get("subcategory");
  const search = params.get("search") ?? "";
  const sortParam = params.get("sort") ?? "default";

  const normalizedCategory = category && category.length > 0 ? category : null;
  const normalizedSubcategory = subcategory && subcategory.length > 0 ? subcategory : null;

  const sort: SortOption =
    sortParam === "price_asc" ||
    sortParam === "price_desc" ||
    sortParam === "popular" ||
    sortParam === "default"
      ? sortParam
      : "default";

  return {
    category: normalizedCategory,
    subcategory: normalizedSubcategory,
    search,
    sort,
  };
}

function writeQuery(next: QueryState) {
  const params = new URLSearchParams();

  if (next.category) params.set("category", next.category);
  if (next.subcategory) params.set("subcategory", next.subcategory);
  if (next.search.trim().length > 0) params.set("search", next.search.trim());
  if (next.sort !== "default") params.set("sort", next.sort);

  const qs = params.toString();
  const newUrl = qs.length ? `${window.location.pathname}?${qs}` : window.location.pathname;

  window.history.replaceState({}, "", newUrl);
}

const Products: InertiaPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("default");

  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function loadProducts(params: { category?: string | null; subcategory?: string | null; search?: string }) {
    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      if (params.category) query.set("category", params.category);
      if (params.subcategory) query.set("subcategory", params.subcategory);
      if (params.search) query.set("search", params.search);

      const res = await fetch(`/api/products?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to load products");

      const json: ProductsResponse = await res.json();
      setProducts(json.data);
    } catch (e) {
      console.error(e);
      setError("Nie udało się załadować produktów.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      const data: Category[] = await res.json();
      setCategories(data);
    } catch (e) {
      console.error(e);
    }
  }

  // INIT z URL
  useEffect(() => {
    const q = readQuery();

    setSelectedCategory(q.category);
    setSelectedSubcategory(q.subcategory);
    setSearch(q.search);
    setSort(q.sort);

    loadProducts({ category: q.category, subcategory: q.subcategory, search: q.search });
    loadCategories();
  }, []);

  // ustaw stan + zapisz URL + przeładuj
  function applyFilters(next: Partial<QueryState>) {
    const current: QueryState = {
      category: selectedCategory,
      subcategory: selectedSubcategory,
      search,
      sort,
    };

    const merged: QueryState = { ...current, ...next };
    if (!merged.category) merged.subcategory = null;

    setSelectedCategory(merged.category);
    setSelectedSubcategory(merged.subcategory);
    setSearch(merged.search);
    setSort(merged.sort);

    writeQuery(merged);

    loadProducts({
      category: merged.category,
      subcategory: merged.subcategory,
      search: merged.search,
    });
  }

  const handleCategoryChange = (slug: string | null) => {
    applyFilters({ category: slug, subcategory: null });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ search });
  };

  // ✅ sortowanie (cena + popularność)
  const visibleProducts = useMemo(() => {
    const arr = [...products];

    if (sort === "popular") {
      const toNumber = (v: unknown): number => {
        if (typeof v === "number") return v;
        if (typeof v === "string") {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        }
        return 0;
      };

      const score = (p: Product): number => {
        const sold = toNumber(p.sold_count);
        const orders = toNumber(p.orders_count);
        const pop = toNumber(p.popularity);
        return sold || orders || pop;
      };

      arr.sort((a, b) => {
        const diff = score(b) - score(a);
        if (diff !== 0) return diff;
        return a.id - b.id; // stabilnie
      });
    }

    if (sort === "price_asc") arr.sort((a, b) => a.price - b.price);
    if (sort === "price_desc") arr.sort((a, b) => b.price - a.price);

    return arr;
  }, [products, sort]);

  async function addToCart(productId: number) {
    try {
      setError(null);

      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          product_id: productId,
          quantity: 1,
          session_id: "demo-session",
        }),
      });

      if (!res.ok) throw new Error("Failed to add to cart");

      setToast("Dodano produkt do koszyka!");
      setTimeout(() => setToast(null), 2000);
    } catch (e) {
      console.error(e);
      setError("Nie udało się dodać do koszyka.");
    }
  }

  return (
    <>
      <Head title="Katalog produktów" />

      <div className="w-full px-6 py-8">
        <div className="w-full max-w-screen-xl mx-auto">
          <header className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Katalog produktów</h1>
              <p className="text-sm text-gray-500">Produkty: {visibleProducts.length}</p>
            </div>
          </header>

          {toast && <div className="mb-4 rounded bg-green-100 text-green-700 px-4 py-2">{toast}</div>}

          <div className="grid gap-6 lg:grid-cols-[280px_1fr] items-start">
            <aside className="hidden lg:block">
              <div className="rounded-2xl border bg-white p-4">
                <div className="text-sm font-semibold mb-3">Kategorie</div>

                <div className="space-y-1">
                  {categories.map((cat) => {
                    const isOpen = openSlug === cat.slug;

                    return (
                      <div key={cat.slug} className="border-b last:border-b-0 py-1">
                        <button
                          type="button"
                          onClick={() => setOpenSlug((s) => (s === cat.slug ? null : cat.slug))}
                          className="w-full flex items-center justify-between rounded-xl px-3 py-2 hover:bg-gray-50 text-left"
                          aria-expanded={isOpen}
                        >
                          <span className="text-sm font-medium">{cat.name}</span>
                          <span className={`text-gray-500 transition ${isOpen ? "rotate-180" : ""}`}>▾</span>
                        </button>

                        {isOpen && (
                          <div className="pl-3 pb-2">
                            <a
                              href={`/products?category=${encodeURIComponent(cat.slug)}`}
                              className="block text-sm text-blue-700 hover:underline py-1"
                            >
                              Zobacz wszystko
                            </a>

                            {Array.isArray(cat.subcategories) &&
                              cat.subcategories.map((s) => {
                                const href = `/products?category=${encodeURIComponent(
                                  cat.slug
                                )}&subcategory=${encodeURIComponent(s.slug)}`;

                                return (
                                  <a
                                    key={`${cat.slug}-${s.slug}`}
                                    href={href}
                                    className="block text-sm text-gray-700 hover:underline py-1"
                                  >
                                    {s.name}
                                  </a>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>

            <section className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCategoryChange(null)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      selectedCategory === null ? "bg-gray-900 text-white" : "bg-white text-gray-700"
                    }`}
                  >
                    Wszystkie
                  </button>

                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => handleCategoryChange(cat.slug)}
                      className={`px-3 py-1 rounded-full text-sm border ${
                        selectedCategory === cat.slug ? "bg-gray-900 text-white" : "bg-white text-gray-700"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Sortuj:</span>
                    <select
                      value={sort}
                      onChange={(e) => applyFilters({ sort: e.target.value as SortOption })}
                      className="border rounded px-3 py-1 text-sm bg-white"
                    >
                      <option value="default">Domyślnie</option>
                      <option value="popular">Popularność</option>
                      <option value="price_asc">Cena: rosnąco</option>
                      <option value="price_desc">Cena: malejąco</option>
                    </select>
                  </div>

                  <form onSubmit={handleSearchSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Szukaj produktu..."
                      className="border rounded px-3 py-1 text-sm w-56"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1 rounded bg-gray-900 text-white text-sm hover:bg-gray-800"
                    >
                      Szukaj
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        applyFilters({
                          category: null,
                          subcategory: null,
                          search: "",
                          sort: "default",
                        })
                      }
                      className="px-4 py-1 rounded bg-gray-200 text-gray-800 text-sm hover:bg-gray-300"
                    >
                      Reset
                    </button>
                  </form>
                </div>
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}

              {loading ? (
                <div className="text-gray-600">Ładowanie produktów...</div>
              ) : visibleProducts.length === 0 ? (
                <div className="text-gray-600">Brak produktów.</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleProducts.map((p) => (
                    <div key={p.id} className="bg-white rounded-lg shadow p-4 flex h-full flex-col">
                      <Link href={`/products/${p.slug}`} className="block">
                        {p.images && p.images.length > 0 ? (
                          <img
                            src={imageUrl(p.images[0])}
                            alt={p.name}
                            className="w-full h-40 object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-40 bg-gray-200 rounded flex items-center justify-center text-gray-500">
                            Brak zdjęcia
                          </div>
                        )}
                      </Link>

                      {/* CONTENT (flex-1) */}
                      <div className="flex flex-1 flex-col">
                        <div className="mt-3 text-xs uppercase text-gray-500">
                          {p.category?.name}
                          {p.subcategory?.name ? ` / ${p.subcategory.name}` : ""}
                        </div>

                        <div className="font-semibold text-gray-900 line-clamp-2">{p.name}</div>

                        <div className="mt-1 font-bold">{formatPrice(p.price)}</div>

                        <div className="mt-2 text-sm">
                          Dostępne:{" "}
                          <span className={p.stock > 0 ? "text-green-700" : "text-red-600"}>
                            {p.stock > 0 ? p.stock : "brak"}
                          </span>
                        </div>
                      </div>

                      {/* ACTIONS (zawsze na dole) */}
                      <div className="mt-auto pt-4 flex gap-2">
                        <Link
                          href={`/products/${p.slug}`}
                          className="flex-1 text-center px-3 py-2 rounded border text-sm hover:bg-gray-50"
                        >
                          Zobacz
                        </Link>

                        <button
                          type="button"
                          onClick={() => addToCart(p.id)}
                          disabled={p.stock <= 0}
                          className="flex-1 px-3 py-2 rounded bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:bg-gray-300"
                        >
                          Do koszyka
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

Products.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;

export default Products;
