/// <reference types="emscripten" />

export interface LedgerModule extends EmscriptenModule {
  _main(argc: number, argv: number): number;

  FS: typeof FS;

  lengthBytesUTF8: typeof lengthBytesUTF8;
  stringToUTF8: typeof stringToUTF8;
};

export type LedgerFactory = EmscriptenModuleFactory<LedgerModule>;
