/// <reference types="emscripten" />

interface TypeIDBFS extends Emscripten.FileSystemType {
  DB_VERSION: number,
  DB_STORE_NAME: string,
}

export interface LedgerModule extends EmscriptenModule {
  _main(argc: number, argv: number): number;

  FS: typeof FS;
  IDBFS: TypeIDBFS;

  lengthBytesUTF8: typeof lengthBytesUTF8;
  stringToUTF8: typeof stringToUTF8;
};

export type LedgerFactory = EmscriptenModuleFactory<LedgerModule>;
