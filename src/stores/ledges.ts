import { ref, watch } from 'vue';
import { defineStore } from 'pinia';

import debounce from 'debounce';

import { newInstance, DATA_DIR } from '@/lib/ledger';
import wow from '../../ledger/test/input/wow.dat?raw';

function state() {
  const bookmarks = ref([
    '-f - balance',
    '-f - register',
    '-f - xml',
    '-f - emacs',
    '--version',
  ]);
  const command = ref(bookmarks.value[0]);
  const input = ref(wow);
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
