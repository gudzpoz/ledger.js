import loadLedger from '@ledger/ledger.js';
import loadPath from '@ledger/ledger.wasm?url';
import type { LedgerModule } from './types';

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
      if (c === undefined) {
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
 * Ledger environment config.
 */
interface LedgerEnvironment {
  wasmFileLocation?: string;
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
    console.log(this.#runtime);
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

  /**
   * Executes a Ledger command.
   *
   * ```js
   * ledger.run('-f', '/input.dat', 'bal');
   * ```
   */
  run(args?: string[], stdin?: string) {
    this.#stdout.clear();
    this.#stderr.clear();
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
        console.log(result.message);
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
 * Loads the required WASM files for Ledger and instantiates one.
 */
async function newInstance(environment?: LedgerEnvironment) {
  const env = environment ?? {};
  const stdin = new StringReader();
  const stdout = new StringBuilder();
  const stderr = new StringBuilder();
  const config: Partial<LedgerModule> = {
    locateFile: (path: string, prefix: string) => {
      return env.wasmFileLocation || loadPath || prefix + path;
    },
    preRun: [() => config.FS?.init(stdin.iter(), null, null)],
    print: stdout.appender(),
    printErr: stderr.appender(),
  };
  const runtime = await loadLedger(config);
  console.log(runtime);
  return new LedgerCLI(runtime, stdin, stdout, stderr);
}

export default newInstance;
