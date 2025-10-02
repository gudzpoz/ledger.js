/// <reference types="emscripten" />

declare module '@ledger/ledger.js' {
  const factory: import('./ledger-types').LedgerFactory;

  export default factory;
}
