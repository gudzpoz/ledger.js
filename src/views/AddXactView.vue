<script setup lang="ts">
import { onMounted, ref } from 'vue';

import PieMenu, { type MenuItem } from '@/components/PieMenu.vue';

import { useLedger } from '@/lib/ledger-web';
import type { AccountTrie } from '@/lib/ledger-types';

const root = ref<MenuItem[]>([]);
let idgen = 0;
onMounted(async () => {
  const data = useLedger();
  root.value = trieToMenu(await data.readAccountsAsTrie('/data/stdin'));
});
function trieToMenu(trie: AccountTrie): MenuItem[] {
  if (!trie.children) {
    return [];
  }
  return Object.entries(trie.children).map(([label, v]) => ({
    label,
    id: v.id ?? idgen++,
    children: trieToMenu(v),
  }));
}
</script>

<template>
  <v-card>
    <v-card-title>
      <p>(No-op page: trying out ideas for mobile-friendly transaction UI...)</p>
    </v-card-title>
    <v-card-text>
      <v-expansion-panels>
        <v-expansion-panel title="Tree Select">
          <v-expansion-panel-text>
            Classic.
            <v-treeview :items="root" open-on-click item-value="id" item-title="label" />
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel title="Circular Menu">
          <v-expansion-panel-text>
            Feeling lost.
            <PieMenu :menu="root" />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>
</template>
