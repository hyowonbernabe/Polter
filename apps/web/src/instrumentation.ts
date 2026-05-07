/**
 * Next.js instrumentation hook — runs once at server startup.
 *
 * Next.js 15 passes `--localstorage-file` to Node.js 22, which provides a
 * `localStorage` global in server workers. When the path is missing the flag
 * is silently ignored but `localStorage` may still be undefined or have no
 * methods. Patch it here so SSR never throws on localStorage access.
 */
export async function register() {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem:    (k: string) => store.get(k) ?? null,
        setItem:    (k: string, v: string) => { store.set(k, String(v)); },
        removeItem: (k: string) => { store.delete(k); },
        clear:      () => { store.clear(); },
        get length() { return store.size; },
        key:        (i: number) => [...store.keys()][i] ?? null,
      } as Storage,
      writable:     true,
      configurable: true,
    });
  } else {
    // localStorage exists but may lack getItem (broken --localstorage-file path)
    const ls = globalThis.localStorage as unknown as Record<string, unknown>;
    if (typeof ls.getItem !== 'function') {
      const store = new Map<string, string>();
      ls.getItem    = (k: string) => store.get(k) ?? null;
      ls.setItem    = (k: string, v: string) => { store.set(k, String(v)); };
      ls.removeItem = (k: string) => { store.delete(k); };
      ls.clear      = () => { store.clear(); };
    }
  }
}
