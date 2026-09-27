const origin = 'http://127.0.0.1:4173';
let running = false;
try { running = (await fetch(`${origin}/`, { signal: AbortSignal.timeout(1000) })).ok; } catch { /* Start a local static server below. */ }
if (!running) {
  process.env.PORT = '4173';
  await import('./preview.mjs');
  await new Promise((resolve, reject) => {
    let attempts = 0;
    const timer = setInterval(async () => {
      try { if ((await fetch(origin)).ok) { clearInterval(timer); resolve(); } }
      catch { if (++attempts > 30) { clearInterval(timer); reject(new Error('Preview did not start.')); } }
    }, 100);
  });
}
await import('./capture-preview.mjs');
await import('./measure-mobile.mjs');
process.exit(0);
