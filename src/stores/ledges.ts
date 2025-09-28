import { ref, watch } from 'vue';
import { defineStore } from 'pinia';

import debounce from 'debounce';

import { newInstance, DATA_DIR } from '@/lib/ledger';

function state() {
  const bookmarks = ref([
    '-f - balance',
    '-f - register',
    '-f - xml',
    '-f - emacs',
    '--version',
  ]);
  const command = ref(bookmarks.value[0]);
  const input = ref(`2015/10/12 Exxon
    Expenses:Auto:Gas         $10.00
    Liabilities:MasterCard   $-10.00
`);
  watch(input, debounce(async (text) => {
    const fs = (await newInstance()).FS();
    fs.writeFile(`${DATA_DIR}/stdin`, text);
  }, 1000));
  return { bookmarks, command, input };
}

export const useLedgeStore = defineStore('ledge', {
  state,
  persist: true,
});
