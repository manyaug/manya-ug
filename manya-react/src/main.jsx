import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Purge legacy handcrafted SW caches (e.g., manya-v9)
if ('caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      if (name.startsWith('manya-v')) {
        caches.delete(name);
      }
    }
  });
}

// Unregister old legacy Service Workers proactively
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL;
      if (scriptURL && !scriptURL.endsWith('/sw.js')) {
        registration.unregister();
      }
    }
  });
}

// Automatic service worker registration and updates
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available! Reload to update?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

