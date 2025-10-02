import { newInstance } from './ledger-wrapper';

const useFS = newInstance().then((ledger) => ledger.FS());

export async function useLedgerFS() {
  const fs = await useFS;
  return new Promise<typeof fs>((accept, reject) => {
    fs.syncfs(true, (err) => {
      if (err) {
        reject(err);
      } else {
        accept(fs);
      }
    });
  });
}

const worker = new ComlinkWorker<typeof import('./ledger-worker')>(
  new URL('./ledger-worker.ts', import.meta.url),
  {
    name: 'ledger-worker',
  },
);

export function useLedger() {
  return worker;
}
