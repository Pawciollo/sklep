import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';

const shopName = import.meta.env.VITE_APP_NAME || 'Sklep fitness';
const adminSuffix = 'Panel admina';

    createInertiaApp({
    title: (title) => {
        const isAdmin = window.location.pathname.startsWith('/admin');

        const suffix = isAdmin ? adminSuffix : shopName;

        if (!title) {
        return suffix;
        }

        return `${title} — ${suffix}`;
    },
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
