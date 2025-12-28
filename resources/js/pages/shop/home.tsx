// resources/js/pages/shop/home.tsx

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
  sold_count?: number | string | null;
  name: string;
  slug: string;
  price: number; // grosze
  images: string[] | null;
  category: Category;
};

type ProductsResponse = {
  data: Product[];
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

type PageWithLayout = React.FC & {
  layout?: (page: ReactNode) => ReactNode;
};

const Home: PageWithLayout = () => {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const [slide, setSlide] = useState(0);
  const VISIBLE = 3;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [productsRes, categoriesRes] = await Promise.all([
          fetch("/api/products?sort=popular", { headers: { Accept: "application/json" } }),
          fetch("/api/categories", { headers: { Accept: "application/json" } }),
        ]);

        if (!productsRes.ok) throw new Error("Nie udało się załadować produktów.");
        if (!categoriesRes.ok) throw new Error("Nie udało się załadować kategorii.");

        const productsJson: ProductsResponse = await productsRes.json();
        const categoriesJson: Category[] = await categoriesRes.json();

        setFeatured(productsJson.data.slice(0, 12));
        setCategories(categoriesJson);
      } catch (e: unknown) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Wystąpił błąd przy ładowaniu danych.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const canSlide = featured.length > VISIBLE;

  const visibleProducts = useMemo(() => {
    if (featured.length <= VISIBLE) return featured;
    const out: Product[] = [];
    for (let i = 0; i < VISIBLE; i++) out.push(featured[(slide + i) % featured.length]);
    return out;
  }, [featured, slide]);

  function prev() {
    if (!canSlide) return;
    setSlide((s) => (s - 1 + featured.length) % featured.length);
  }

  function next() {
    if (!canSlide) return;
    setSlide((s) => (s + 1) % featured.length);
  }

  return (
    <div className="w-full">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/5 via-transparent to-gray-900/10" />
        <div className="relative grid gap-8 md:grid-cols-2 items-center p-6 sm:p-10">
          <div>
            <div className="inline-flex items-center rounded-full bg-gray-900 text-white px-3 py-1 text-xs font-medium">
              Nowości + bestsellery
            </div>

            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
              Wszystko, czego potrzebujesz do treningu.
            </h2>

            <p className="mt-4 text-gray-700 max-w-xl">
              Suplementy, akcesoria i sprzęt dla osób, które traktują trening serio. Zbuduj formę z naszym sklepem
              fitness.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/products"
                className="inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm text-white hover:bg-gray-800 transition"
              >
                Przeglądaj produkty
              </a>
              <a
                href="/cart"
                className="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 transition"
              >
                Zobacz koszyk
              </a>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="rounded-3xl border bg-gradient-to-br from-gray-900 to-gray-700 p-10 text-white">
              <div className="text-sm opacity-80">Twój ulubiony sklep fitness online</div>
              <div className="mt-4 text-2xl font-bold leading-snug">Szybkie zakupy, prosta dostawa, fajne produkty.</div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-2xl bg-white/10 p-3">Szybka wysyłka</div>
                <div className="rounded-2xl bg-white/10 p-3">Płatności online</div>
                <div className="rounded-2xl bg-white/10 p-3">Historia zamówień na stronie</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mt-10 grid gap-8 lg:grid-cols-[280px_1fr] items-start">
        {/* LEFT MENU */}
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

        {/* FEATURED */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold">Polecane produkty</h3>
              <p className="text-sm text-gray-600">Najczęściej wybierane w tym tygodniu</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prev}
                disabled={!canSlide}
                className="h-9 w-9 rounded-full border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Poprzednie"
              >
                ←
              </button>
              <button
                type="button"
                onClick={next}
                disabled={!canSlide}
                className="h-9 w-9 rounded-full border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Następne"
              >
                →
              </button>

              <a href="/products" className="ml-2 text-sm text-blue-700 hover:underline">
                Zobacz wszystkie
              </a>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border bg-white p-6 text-gray-700">Ładowanie...</div>
          ) : error ? (
            <div className="rounded-2xl border bg-white p-6 text-red-700">{error}</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {visibleProducts.map((p) => {
                const first = p.images?.[0] ? imageUrl(p.images[0]) : null;

                return (
                  <article
                    key={p.id}
                    className="group h-full rounded-2xl border bg-white overflow-hidden hover:shadow-md transition"
                    >
                    <a href={`/products/${p.slug}`} className="flex h-full flex-col">
                        <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                        {first ? (
                            <img
                            src={first}
                            alt={p.name}
                            className="h-full w-full object-cover group-hover:scale-[1.02] transition"
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-500">Brak zdjęcia</div>
                        )}
                        </div>

                        <div className="p-4 flex flex-1 flex-col">
                        <div className="text-xs uppercase tracking-wide text-gray-500">{p.category?.name}</div>
                        <div className="mt-1 min-h-[48px] font-semibold text-gray-900 line-clamp-2">{p.name}</div>

                        <div className="mt-2 text-lg font-bold">{formatPrice(p.price)}</div>

                        {Number(p.sold_count) > 0 ? (
                            <div className="mt-2 text-sm text-gray-600 text-center">
                            W tym tygodniu sprzedano już {Number(p.sold_count)} szt.!
                            </div>
                        ) : (
                            <div className="mt-2 text-sm text-gray-400 text-center">
                            Polecane w tym tygodniu przez naszych ekspertów!
                            </div>
                        )}

                        <div className="mt-auto pt-4">
                            <span className="inline-flex items-center justify-center w-full rounded-xl bg-gray-900 px-4 py-2 text-sm text-white group-hover:bg-gray-800">
                            Przejdź do produktu
                            </span>
                        </div>
                        </div>
                    </a>
                    </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

Home.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;

export default Home;
