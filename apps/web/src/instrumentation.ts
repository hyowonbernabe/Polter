/**
 * Next.js instrumentation hook — runs once at server startup.
 *
 * Next.js 15 passes `--localstorage-file` to Node.js 22, which provides a
 * `localStorage` global in server workers. When the path is missing the flag
 * is silently ignored but `localStorage` may still be undefined or have no
 * methods. Patch it here so SSR never throws on localStorage access.
 */
function makeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem:    (k: string) => store.get(k) ?? null,
    setItem:    (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear:      () => { store.clear(); },
    get length() { return store.size; },
    key:        (i: number) => [...store.keys()][i] ?? null,
  } as Storage;
}

export async function register() {
  // Next.js 15 + Node.js 22: --localstorage-file may provide a broken Proxy
  // that exists but whose getItem is not a function. Replace the whole global.
  const needsPatch =
    typeof globalThis.localStorage === 'undefined' ||
    typeof (globalThis.localStorage as unknown as Record<string, unknown>).getItem !== 'function';

  if (needsPatch) {
    Object.defineProperty(globalThis, 'localStorage', {
      value:        makeStorage(),
      writable:     true,
      configurable: true,
    });
  }
}
