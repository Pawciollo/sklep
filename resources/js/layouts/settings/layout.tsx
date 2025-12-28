import Heading from '@/components/heading';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { edit as editPassword } from '@/routes/password';
import { edit } from '@/routes/profile';
import { show } from '@/routes/two-factor';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

const sidebarNavItems: NavItem[] = [
  { title: 'Profil', href: edit(), icon: null },
  { title: 'Hasło', href: editPassword(), icon: null },
  { title: 'Uwierzytelnianie 2FA', href: show(), icon: null },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
  // SSR-safe (u Ciebie już tak było)
  if (typeof window === 'undefined') return null;

  const currentPath = window.location.pathname;

  return (
    <div className="px-4 py-6">
      <Heading
        title="Ustawienia"
        description="Zarządzaj profilem i ustawieniami konta"
      />

      <div className="flex flex-col lg:flex-row lg:space-x-12">
        <aside className="w-full max-w-xl lg:w-56">
          <nav className="flex flex-col space-y-1">
            {sidebarNavItems.map((item, index) => {
              const href = typeof item.href === 'string' ? item.href : item.href.url;
              const isActive = currentPath === href;

              return (
                <Link
                  key={`${href}-${index}`}
                  href={item.href}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition',
                    'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                    'dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
                    isActive &&
                      'bg-gray-900 text-white hover:bg-gray-900 hover:text-white ' +
                        'dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-100 dark:hover:text-gray-900'
                  )}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  <span className="font-medium">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <Separator className="my-6 lg:hidden" />

        <div className="flex-1 md:max-w-2xl">
          <section className="max-w-xl space-y-12">{children}</section>
        </div>
      </div>
    </div>
  );
}
