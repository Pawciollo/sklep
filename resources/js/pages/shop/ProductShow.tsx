import { useEffect, useMemo, useRef, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";

type Category = {
  id: number;
  name: string;
  slug: string;
};

type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  description: string | null;
  images: string[] | null;
  category: Category;
  stock: number;
};

type PageProps = {
  slug: string;
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

export default function ProductShow() {
  const { slug } = usePage<PageProps>().props;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const sessionId = "demo-session";

  // kontrola czasu wyświetlania komunikatu (żeby timery się nie nakładały)
  const messageTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/products/${slug}`, {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) throw new Error("Nie udało się pobrać produktu.");

        const json: Product = await res.json();
        setProduct(json);

        const imgs = json.images ?? [];
        setSelectedImage(imgs[0] ? imageUrl(imgs[0]) : null);
      } catch (e: unknown) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Wystąpił błąd przy ładowaniu produktu.");
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [slug]);

  // cleanup timera przy wyjściu ze strony
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current !== null) {
        window.clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  async function addToCart() {
    if (!product) return;

    try {
      setError(null);

      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: 1,
          session_id: sessionId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Nie udało się dodać do koszyka.");
      }

      setMessage("Produkt dodany do koszyka!");

      // wydłużamy czas i zapobiegamy nakładaniu timerów
      if (messageTimeoutRef.current !== null) {
        window.clearTimeout(messageTimeoutRef.current);
      }

      const MESSAGE_VISIBLE_MS = 8000; // <- tu zmieniasz czas, np. 6000 / 10000
      messageTimeoutRef.current = window.setTimeout(() => setMessage(null), MESSAGE_VISIBLE_MS);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Wystąpił błąd przy dodawaniu do koszyka.");
    }
  }

  const images = useMemo(() => (product?.images ?? []).filter(Boolean), [product?.images]);

  if (loading) {
    return (
      <div className="py-8">
        <div className="rounded-2xl border bg-white p-6">Ładowanie produktu...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="py-8">
        <div className="rounded-2xl border bg-white p-6 text-red-700">
          {error ?? "Nie znaleziono produktu."}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/products" className="text-sm text-gray-700 hover:underline">
          ← Wróć do produktów
        </Link>

        <div className="text-sm text-gray-500">{product.category?.name}</div>
      </div>

      {message && (
        <div className="fixed top-20 left-1/2 z-50 w-[min(100%-2rem,1100px)] -translate-x-1/2">
            <div className="rounded-xl border bg-green-50 text-green-800 px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-medium">{message}</div>

                <Link
                href="/cart"
                className="inline-flex items-center justify-center rounded-xl bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 transition"
                >
                Przejdź do koszyka
                </Link>
            </div>
            </div>
        </div>
        )}

      {error && (
        <div className="mb-4 rounded-xl border bg-red-50 text-red-700 px-4 py-3">{error}</div>
      )}

      <div className="grid gap-8 lg:grid-cols-2 items-start">
        {/* GALERIA */}
        <div className="rounded-3xl border bg-white p-4">
          {selectedImage ? (
            <div className="overflow-hidden rounded-2xl bg-gray-100">
              <img src={selectedImage} alt={product.name} className="w-full object-cover" />
            </div>
          ) : (
            <div className="w-full h-72 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500">
              Brak zdjęcia
            </div>
          )}

          {images.length > 1 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {images.map((path) => {
                const url = imageUrl(path);
                const active = selectedImage === url;

                return (
                  <button
                    key={path}
                    type="button"
                    onClick={() => setSelectedImage(url)}
                    className={`rounded-xl border p-1 transition ${
                      active ? "ring-2 ring-gray-900 border-gray-900" : "hover:bg-gray-50"
                    }`}
                    title="Wybierz zdjęcie"
                  >
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* OPIS / CTA */}
        <div className="rounded-3xl border bg-white p-6">
          <div className="text-xs uppercase tracking-wide text-gray-500">{product.category?.name}</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{product.name}</h1>

          <div className="mt-3 flex items-end justify-between gap-4">
            <div className="text-2xl font-bold">{formatPrice(product.price)}</div>
            <div className="text-sm">
              Dostępność:{" "}
              <span className={product.stock > 0 ? "text-green-700 font-medium" : "text-red-600 font-medium"}>
                {product.stock > 0 ? `${product.stock} szt.` : "brak"}
              </span>
            </div>
          </div>

          {product.description && (
            <p className="mt-6 text-gray-700 whitespace-pre-line leading-relaxed">{product.description}</p>
          )}

          <div className="mt-8">
            {product.stock > 0 ? (
              <button
                className="w-full inline-flex items-center justify-center rounded-2xl bg-gray-900 px-5 py-3 text-sm text-white hover:bg-gray-800 transition"
                onClick={addToCart}
              >
                Dodaj do koszyka
              </button>
            ) : (
              <button
                disabled
                className="w-full inline-flex items-center justify-center rounded-2xl bg-gray-200 px-5 py-3 text-sm text-gray-600 cursor-not-allowed"
              >
                Brak w magazynie
              </button>
            )}
          </div>

          <div className="mt-4 text-xs text-gray-500">W razie pytań: support@sklepfitness.pl</div>
        </div>
      </div>
    </div>
  );
}

ProductShow.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
