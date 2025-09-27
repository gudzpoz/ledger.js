/// <reference types="emscripten" />

declare module '@ledger/ledger.js' {
  const factory: import('./types').LedgerFactory;

  export default factory;
}
