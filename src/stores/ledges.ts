import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useLedgeStore = defineStore('ledge', () => {
  const bookmarks = ref([
    '-f - balance',
    '-f - register',
    '-f - emacs',
    '--version',
  ]);
  const command = ref(bookmarks.value[0]);
  const input = ref(`2015/10/12 Exxon
    Expenses:Auto:Gas         $10.00
    Liabilities:MasterCard   $-10.00
`);
  return { bookmarks, command, input };
});
