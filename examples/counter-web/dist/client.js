import { jsx as _jsx } from "@warog/dom/jsx-runtime";
/** @jsxImportSource @warog/dom */
import { hydrate } from '@warog/dom';
import { App } from './app.js';
hydrate(document.getElementById('app'), _jsx(App, {}), {
    onHydrationMismatch: (diagnostic) => {
        console.warn('[warog hydration]', diagnostic.code, diagnostic.message);
    }
});
//# sourceMappingURL=client.js.map