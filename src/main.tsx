import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { BackendProvider } from './state/backendContext';
import { UIProvider } from './state/ui';
import { createBackend } from './services';
import { legacyHashToPath } from './lib/legacyHash';
import { startShoppingSync } from './state/shoppingSync';
import { refreshAllStock } from './services/stock';
import './styles/index.css';

// Links shared from the previous version used hash routes (#/p/105). Send them to the new clean URLs.
const legacy = legacyHashToPath(window.location.hash, window.location.pathname);
if (legacy) window.history.replaceState(null, '', legacy);

const backend = createBackend();
const render = () =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <BackendProvider backend={backend}>
          <UIProvider>
            <App />
          </UIProvider>
        </BackendProvider>
      </BrowserRouter>
    </StrictMode>,
  );
// Restore the saved login first (so member-only pages don't bounce to login), then let the cart and wishlist follow the member.
void Promise.race([Promise.all([backend.ready, refreshAllStock().catch(() => undefined)]), new Promise((r) => setTimeout(r, 4000))]).finally(() => {
  startShoppingSync(backend);
  render();
});
