// resources/js/types/inertia-page.ts
import React from 'react';

export type InertiaPage<P = Record<string, unknown>> = React.FC<P> & {
    layout?: (page: React.ReactNode) => React.ReactNode;
};
