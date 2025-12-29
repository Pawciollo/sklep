import React, { useEffect, useRef, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";

type SharedUser = {
  id: number;
  name: string;
  email: string;
  is_admin?: boolean;
};

type SharedProps = {
  auth?: {
    user?: SharedUser | null;
  };
};

export type BreadcrumbItem = {
  title: string;
  href?: string;
};

type Props = {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
};

export default function AppLayout({ children, breadcrumbs = [] }: Props) {
  const { auth } = usePage<SharedProps>().props;
  const user = auth?.user;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = (): void => {
    setMenuOpen(false);

    router.post(
      "/logout",
      {},
      {
        onSuccess: () => {
          // Wymuszamy pełne odświeżenie, żeby wyczyścić stan SPA po wylogowaniu
          window.location.reload();
        },
      }
    );
  };

  // zamknij dropdown po kliknięciu poza
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuOpen) return;
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white text-sm font-bold">
              SF
            </span>
            <span className="text-lg sm:text-xl font-bold tracking-tight group-hover:opacity-90">
              Sklep fitness
            </span>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6 text-sm">
            <Link
              href="/products"
              className="hidden sm:inline-flex items-center text-gray-700 hover:text-gray-900"
            >
              Produkty
            </Link>

            <Link href="/cart" className="inline-flex items-center text-gray-700 hover:text-gray-900">
              Koszyk
            </Link>

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-gray-800 hover:bg-gray-50"
                >
                  <span className="hidden sm:inline">{user.name}</span>
                  <span className="text-xs opacity-70">Konto</span>
                  <span className={`text-xs transition ${menuOpen ? "rotate-180" : ""}`}>▾</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white shadow-lg overflow-hidden z-20">
                    <div className="px-4 py-3 text-xs text-gray-500 border-b">
                      Zalogowano jako <span className="font-medium text-gray-800">{user.email}</span>
                    </div>

                    <Link
                      href="/orders"
                      className="block px-4 py-2 text-sm hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      Moje zamówienia
                    </Link>

                    <Link
                      href="/settings/profile"
                      className="block px-4 py-2 text-sm hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      Ustawienia konta
                    </Link>

                    {user.is_admin && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm hover:bg-gray-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        Panel admina
                      </Link>
                    )}

                    <button
                      type="button"
                      className="w-full text-left block px-4 py-2 text-sm hover:bg-gray-50"
                      onClick={handleLogout}
                    >
                      Wyloguj
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-full border px-3 py-1.5 text-gray-800 hover:bg-gray-50"
                >
                  Zaloguj
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-flex items-center rounded-full bg-gray-900 px-3 py-1.5 text-white hover:bg-gray-800"
                >
                  Rejestracja
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* CONTENT */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {breadcrumbs.length > 0 && (
          <nav className="mb-6 text-sm text-gray-600">
            <ol className="flex flex-wrap items-center gap-2">
              {breadcrumbs.map((item, idx) => (
                <li key={`${item.title}-${idx}`} className="flex items-center gap-2">
                  {item.href ? (
                    <a href={item.href} className="hover:underline">
                      {item.title}
                    </a>
                  ) : (
                    <span className="text-gray-900">{item.title}</span>
                  )}
                  {idx < breadcrumbs.length - 1 && <span>/</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {children}
      </main>

      {/* FOOTER */}
      <footer className="border-t bg-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <div className="font-bold">Sklep fitness</div>
              <p className="text-sm text-gray-600 mt-2">
                Suplementy, akcesoria i sprzęt. Szybko, prosto i konkretnie.
              </p>
            </div>

            <div className="text-sm">
              <div className="font-semibold mb-2">Linki</div>
              <div className="space-y-1 text-gray-700">
                <Link href="/products" className="block hover:underline">
                  Produkty
                </Link>
                <Link href="/cart" className="block hover:underline">
                  Koszyk
                </Link>
                <Link href="/orders" className="block hover:underline">
                  Zamówienia
                </Link>
              </div>
            </div>

            <div className="text-sm">
              <div className="font-semibold mb-2">Kontakt</div>
              <div className="space-y-1 text-gray-700">
                <div>support@sklepfitness.pl</div>
                <div>pn–pt 9:00–17:00</div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-xs text-gray-500">
            © {new Date().getFullYear()} Sklep fitness. Wszelkie prawa zastrzeżone.
          </div>
        </div>
      </footer>
    </div>
  );
}
