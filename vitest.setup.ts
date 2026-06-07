// Node 22+ defines global web storage stubs that are non-functional without
// --localstorage-file and shadow happy-dom's implementation, so tests get a
// localStorage whose methods are undefined. Replace both globals with a
// working in-memory implementation.
const createMemoryStorage = (): Storage => {
  let store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => {
      store = new Map();
    },
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
};

for (const name of ["localStorage", "sessionStorage"] as const) {
  const storage = createMemoryStorage();
  for (const target of [globalThis, window]) {
    Object.defineProperty(target, name, {
      value: storage,
      writable: true,
      configurable: true,
    });
  }
}
