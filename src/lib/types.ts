/// <reference types='emscripten' />

//#region Emscripten
interface TypeIDBFS extends Emscripten.FileSystemType {
  DB_VERSION: number;
  DB_STORE_NAME: string;
}

export interface LedgerModule extends EmscriptenModule {
  _main(argc: number, argv: number): number;

  FS: typeof FS;
  IDBFS: TypeIDBFS;

  lengthBytesUTF8: typeof lengthBytesUTF8;
  stringToUTF8: typeof stringToUTF8;
}

export type LedgerFactory = EmscriptenModuleFactory<LedgerModule>;
//#endregion Emscripten

//#region XML
export interface LedgerXML {
  ledger: Ledger;
}

type OrMore<T> = T | T[];
type XMLSome<T, Field extends string> = {
  [key in Field]: T | T[];
};

export interface Ledger {
  version: string;
  commodities: XMLSome<Commodity, 'commodity'>;
  accounts: XMLSome<Account, 'account'>;
  transactions: XMLSome<Transaction, 'transaction'>;
}

export interface Commodity {
  symbol: string;
  flags?: string;
  annotation?: Annotation;
}
export interface Annotation {
  price: CommodityQuantity;
  date?: string;
}
export interface CommodityQuantity {
  commodity?: Commodity;
  quantity: number;
}

export interface Account extends XMLSome<Account, 'account'> {
  id: string;
  name: string;
  fullname: string;
  'account-amount'?: BalanceAmount;
  'account-total'?: BalanceAmount;
}
export type Amount = XMLSome<CommodityQuantity, 'amount'>;
export interface BalanceAmount {
  balance?: Amount;
  amount?: Amount['amount'];
}

export interface Transaction {
  date: string;
  payee: string;
  code?: string;
  postings: XMLSome<Posting, 'posting'>;
}
export interface Posting {
  account: { ref: string; name: string };
  'post-amount': Amount;
  total?: BalanceAmount;
  state?: 'pending' | 'cleared';
  cost?: CommodityQuantity;
  note?: string;
  metadata?: Metadata;
}
export interface Metadata {
  value?: OrMore<{ key: string; string: string }>;
  tag?: OrMore<string>;
}
//#endregion XML
