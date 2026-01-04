import { RemixBrowser } from '@remix-run/react';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { makeStore } from './store';

const store = makeStore();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <Provider store={store}>
        <RemixBrowser />
      </Provider>
    </StrictMode>
  );
});
