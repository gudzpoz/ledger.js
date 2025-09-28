import loadLedger from '@ledger/ledger.js';
import loadPath from '@ledger/ledger.wasm?url';

import type { LedgerModule } from './types';
import { parseSexpr, type SExpr } from './emacs';

interface ExitStatus {
  name: 'ExitStatus',
  message: string,
  status: number,
}

class StringReader {
  s?: Uint8Array;
  i!: number;

  constructor() {
    this.set();
  }

  set(s?: Uint8Array) {
    this.s = s;
    this.i = 0;
  }

  iter() {
    return () => {
      if (!this.s) {
        return null;
      }
      const c = this.s[this.i];
      if (c === void 0) {
        return null;
      } else {
        this.i += 1;
        return c;
      }
    };
  }
}

class StringBuilder {
  s!: string;

  constructor() {
    this.clear();
  }

  appender() {
    return (s: string) => { this.s += s + '\n'; };
  }

  clear() {
    this.s = '';
  }
}

/**
 * Ledger execution results.
 */
interface LedgerResult {
  stdout: string;
  stderr: string;
  status: number;
}

class LedgerCLI {
  #runtime: LedgerModule;
  #stdin: StringReader;
  #stdout: StringBuilder;
  #stderr: StringBuilder;

  constructor(runtime: LedgerModule, stdin: StringReader, stdout: StringBuilder, stderr: StringBuilder) {
    this.#runtime = runtime;
    this.#stdin = stdin;
    this.#stdout = stdout;
    this.#stderr = stderr;
  }

  #wrapStringArray(args: string[]) {
    const results = args.map((s) => {
      const size = this.#runtime.lengthBytesUTF8(s) + 1;
      const ptr = this.#runtime._malloc(size);
      this.#runtime.stringToUTF8(s, ptr, size); // Always '\0'-terminated
      return ptr;
    });
    // argv[argc] = nullptr;
    results.push(0);
    return results;
  }

  #wrapNumberArray(ptrs: number[]) {
    const length = ptrs.length * 4;
    const array = this.#runtime._malloc(length);
    new Uint8Array(this.#runtime.HEAPU8.buffer, array, length).set(
      new Uint8Array(new Uint32Array(ptrs).buffer),
    );
    return array;
  }

  #freeStringPointers(ptrs: number[]) {
    ptrs.forEach((ptr) => {
      if (ptr !== 0) {
        this.#runtime._free(ptr);
      }
    });
  }

  #convertStdin(s?: string) {
    if (!s) {
      return null;
    }
    const size = this.#runtime.lengthBytesUTF8(s) + 1;
    const ptr = this.#runtime._malloc(size);
    this.#runtime.stringToUTF8(s, ptr, size); // Always '\0'-terminated
    return {
      ptr,
      utf8: new Uint8Array(this.#runtime.HEAPU8.buffer, ptr, size - 1),
    };
  }

  #reset() {
    this.#stdout.clear();
    this.#stderr.clear();
  }

  /**
   * Executes a Ledger command.
   *
   * ```js
   * ledger.run('-f', '/input.dat', 'bal');
   * ```
   */
  run(args?: string[], stdin?: string) {
    this.#reset();

    const argvPointers = this.#wrapStringArray(['ledger', ...(args ?? [])]);
    const argvArray = this.#wrapNumberArray(argvPointers);
    const input = this.#convertStdin(stdin);
    this.#stdin.set(input?.utf8);
    let status = 1;
    try {
      status = this.#runtime._main(argvPointers.length - 1, argvArray);
    } catch (e) {
      const result = e as ExitStatus;
      if (typeof e === 'object' && result.name === 'ExitStatus') {
        this.#stderr.s = result.message + '\n';
        status = result.status;
      }
    }
    const result: LedgerResult = {
      status,
      stdout: this.#stdout.s,
      stderr: this.#stderr.s,
    };
    if (input) {
      this.#stdin.set();
      this.#runtime._free(input.ptr);
    }
    this.#runtime._free(argvArray);
    this.#freeStringPointers(argvPointers);
    this.#stdout.clear();
    this.#stderr.clear();
    return result;
  }

  /**
   * Returns a handler to modify internal filesystems.
   *
   * Beware that this may crash the whole application if calls go wrong
   * (e.g., calling some functions on inexistent files).
   */
  FS() {
    return this.#runtime.FS;
  }
}

/**
 * Wraps `fetch` and `WebAssembly.instantiateStreaming` to cache compiled products.
 *
 * Modern browsers JIT-compiles WASM code. Re-instantiating code over and over
 * will probably kill the performance.
 */
class WebAssemblyCaching {
  #cached: WebAssembly.Module | null = null;
  #fetch: typeof fetch;
  #instantiateStreaming: typeof WebAssembly.instantiateStreaming;

  constructor() {
    this.#fetch = fetch;
    this.#instantiateStreaming = WebAssembly.instantiateStreaming;
  }

  enable() {
    globalThis.fetch = this.#fetchAdvice;
    WebAssembly.instantiateStreaming = this.#instantiateAdvice;
  }
  disable() {
    globalThis.fetch = this.#fetch;
    WebAssembly.instantiateStreaming = this.#instantiateStreaming;
  }

  #fetchAdvice: typeof fetch = (...args) => {
    if (args.length > 0 && args[0] === loadPath) {
      return Promise.resolve(null) as unknown as Promise<Response>;
    }
    return this.#fetch(...args);
  };
  #instantiateAdvice: typeof WebAssembly.instantiateStreaming = async (source, imports) => {
    const fake = await source;
    if (fake !== null) {
      console.error('other assembly loaded!');
      return this.#instantiateStreaming.call(WebAssembly, fake, imports);
    }
    if (this.#cached !== null) {
      return {
        module: this.#cached,
        instance: await WebAssembly.instantiate(this.#cached, imports),
      };
    }
    const result = await this.#instantiateStreaming.call(
      WebAssembly,
      this.#fetch.call(globalThis, loadPath, { credentials: 'same-origin' }),
      imports,
    );
    this.#cached = result.module;
    return result;
  };
}
export const caching = new WebAssemblyCaching();
caching.enable();

export const DATA_DIR = '/data';

/**
 * Loads the required WASM files for Ledger and instantiates one.
 */
export async function newInstance() {
  const stdin = new StringReader();
  const stdout = new StringBuilder();
  const stderr = new StringBuilder();
  const config: Partial<LedgerModule> = {
    locateFile: () => loadPath,
    preRun: [() => config.FS?.init(stdin.iter(), null, null)],
    print: stdout.appender(),
    printErr: stderr.appender(),
  };
  const runtime = await loadLedger(config);
  runtime.FS.mkdir(DATA_DIR);
  runtime.FS.mount(runtime.IDBFS, { autoPersist: true }, DATA_DIR);
  runtime.FS.chdir(DATA_DIR);
  await new Promise((accept) => runtime.FS.syncfs(true, accept));
  return new LedgerCLI(runtime, stdin, stdout, stderr);
}

export interface Posting {
  lineNum: number,
  account: string,
  amount: string,
  status: boolean,
  comment?: string,
}
export interface Transaction {
  file: string,
  lineNum: number,
  time: number,
  code: boolean,
  payee: string,
  postings: Posting[],
}

function requireArray(x: SExpr): SExpr[] {
  if (!Array.isArray(x)) {
    throw new Error(`sexp: require array: ${x}`);
  }
  return x;
}
function requireString(x: SExpr): string {
  if (typeof x !== 'string') {
    throw new Error(`sexp: require string: ${x}`);
  }
  return x;
}
function requireNumber(x: SExpr): number {
  if (typeof x !== 'number') {
    throw new Error(`sexp: require number: ${x}`);
  }
  return x;
}
function requireBoolean(x: SExpr): boolean {
  if (typeof x !== 'boolean') {
    throw new Error(`sexp: require boolean: ${x}`);
  }
  return x;
}

export function parseEmacsString(emacs: string) {
  const sexp = requireArray(parseSexpr(emacs));
  return sexp.map((xact): Transaction => {
    const [file, lineNum, time, code, payee, ...postings] = requireArray(xact);
    const [high, low] = requireArray(time).map(requireNumber);
    return {
      file: requireString(file),
      lineNum: requireNumber(lineNum),
      time: high << 16 + low,
      code: requireBoolean(code),
      payee: requireString(payee),
      postings: postings.map((posting) => {
        const [lineNum, account, amount, status, comment] = requireArray(posting);
        return {
          lineNum: requireNumber(lineNum),
          account: requireString(account),
          amount: requireString(amount),
          status: requireBoolean(status),
          comment: comment ? requireString(comment) : void 0,
        };
      }),
    };
  });
}

export async function parseFile(path: string, instance?: LedgerCLI) {
  const ledger = instance ?? await newInstance();
  const out = ledger.run(['-f', path, 'emacs']).stdout;
  return parseEmacsString(out);
}

