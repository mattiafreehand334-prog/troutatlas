(function () {
  if (!('serviceWorker' in navigator)) return;

  const isLocalhost =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '[::1]';
  const isSecure = location.protocol === 'https:' || isLocalhost;

  // Service workers are not available on file:// or insecure origins.
  if (!isSecure || location.protocol === 'file:') {
    console.info('[SW] Skipped registration: insecure origin or file protocol.', {
      protocol: location.protocol,
      host: location.host
    });
    return;
  }

  const swUrl = new URL('sw.js', window.location.href);
  const scope = new URL('./', swUrl).pathname;

  (async () => {
    try {
      const check = await fetch(swUrl.toString(), { cache: 'no-store' });
      if (!check.ok) {
        console.warn(`[SW] Skipped registration: ${swUrl.pathname} returned HTTP ${check.status}.`);
        return;
      }

      const contentType = (check.headers.get('content-type') || '').toLowerCase();
      if (contentType && !contentType.includes('javascript') && !contentType.includes('ecmascript')) {
        console.warn(`[SW] Skipped registration: unexpected MIME type "${contentType}" for ${swUrl.pathname}.`);
        return;
      }

      const registration = await navigator.serviceWorker.register(swUrl.toString(), { scope });
      console.info('[SW] Registered successfully.', {
        scriptURL: registration.active?.scriptURL || registration.installing?.scriptURL || swUrl.toString(),
        scope: registration.scope
      });
    } catch (error) {
      console.warn('[SW] Registration failed (non-blocking).', error);
    }
  })();
})();