import { XMLParser } from 'fast-xml-parser';

import { newInstance, parseEmacsString, parseFile, type LedgerResult } from './ledger-wrapper';
import type { AccountTrie, LedgerXML, Transaction } from './ledger-types';
import { asArray } from './ledger-config';

export interface ParsedEmacs {
  type: 'emacs';
  transactions: Transaction[];
}
export interface ParsedXML {
  type: 'xml';
  xml: LedgerXML;
}
export interface ParseError {
  type: 'error';
  error: string;
}
export interface LedgerWorkerResult extends LedgerResult {
  parsed?: ParsedEmacs | ParsedXML | ParseError;
}

const xmlParser = new XMLParser({
  attributeNamePrefix: '',
  ignoreAttributes: false,
});

export async function execute(command: string[], stdin: string): Promise<LedgerWorkerResult> {
  const instance = await newInstance();
  const result: LedgerWorkerResult = instance.run(command, stdin);
  const text = result.stdout === '' ? result.stderr : result.stdout;
  let error: string | undefined;
  if (text.startsWith('(')) {
    try {
      result.parsed = {
        type: 'emacs',
        transactions: parseEmacsString(text),
      };
    } catch (e) {
      error = `unexpected non-sexpr (${e}): ${text}`;
    }
  } else if (text.startsWith('<')) {
    try {
      const parsed = xmlParser.parse(text) as LedgerXML;
      result.parsed = {
        type: 'xml',
        xml: parsed,
      };
    } catch (e) {
      error = `unexpected xml: ${e}`;
    }
  }
  if (error) {
    result.parsed = {
      type: 'error',
      error,
    };
  }
  return result;
}

export async function readAccountsAsTrie(file: string) {
  const data = await parseFile(file);
  const accounts: AccountTrie = {};
  data.forEach(({ postings }) => asArray(postings.posting).forEach(({ account }) => {
    const categories = account.name.split(':');
    const last = categories.reduce((trie, category) => {
      if (!trie.children) {
        trie.children = {};
      }
      let next = trie.children[category];
      if (!next) {
        trie.children[category] = next = {};
      }
      return next;
    }, accounts);
    last.id = account.name;
  }));
  return accounts;
}
