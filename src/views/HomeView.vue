<script setup lang="ts">
import { ref, watch } from 'vue';
import { XMLParser } from 'fast-xml-parser';

import { asArray, newInstance, parseEmacsString } from '@/lib/ledger';
import { useLedgeStore } from '@/stores/ledges';
import type { CommodityQuantity, LedgerXML, Transaction } from '@/lib/types';

const store = useLedgeStore();
const status = ref(0);
const output = ref('');

const xmlParser = new XMLParser({
  attributeNamePrefix: '',
  ignoreAttributes: false,
});
const emacs = ref<{
  date: string,
  what: string,
  account: string,
  amount: string,
}[]>([]);
function toTable(xacts: readonly Transaction[]) {
  return xacts.flatMap(({ date, payee, postings }) => {
    const rows = asArray(postings.posting).map(({ account, 'post-amount': amount }) => {
      let amount1: CommodityQuantity;
      if (Array.isArray(amount.amount)) {
        amount1 = amount.amount[0];
      } else {
        amount1 = amount.amount;
      }
      const amountText = `${
        amount1.commodity?.symbol ?? ''
      } ${isNaN(amount1.quantity) ? '' : amount1.quantity}`;
      return {
        date: '', what: '',
        account: account.name,
        amount: amountText,
      };
    });
    rows[0].date = date;
    rows[0].what = payee;
    return rows;
  });
}
async function update() {
  const { command, input } = store;
  const ledger = await newInstance();
  const result = ledger.run(
    command.split(/\s+/).filter((s) => !!s),
    input,
  );
  status.value = result.status;
  const text = result.stdout === '' ? result.stderr : result.stdout;
  emacs.value = [];
  if (text.startsWith('(')) {
    try {
      emacs.value = toTable(parseEmacsString(text));
    } catch (e) {
      console.log('unexpected non-sexpr', text, e);
    }
  } else if (text.startsWith('<')) {
    try {
      const parsed = xmlParser.parse(text) as LedgerXML;
      emacs.value = toTable(asArray(parsed.ledger.transactions.transaction));
    } catch (e) {
      console.log('unexpected xml', e);
    }
  }
  output.value = text;
}
watch(store, update);
update();
</script>

<template>
  <v-card>
    <v-card-text>
      <v-form>
        <v-combobox label="Ledger Command" :items="store.bookmarks" v-model="store.command" />
        <v-textarea v-model="store.input"
          label="Standard Input (stdin)" auto-grow style="font-family: monospace;" />
      </v-form>
    </v-card-text>
    <v-card-text>
      <v-data-table v-show="emacs.length !== 0" :items="emacs" />
      <pre>{{ output }}</pre>
    </v-card-text>
  </v-card>
</template>
