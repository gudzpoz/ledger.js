<script setup lang="ts">
import { ref, watch } from 'vue';

import { newInstance, parseEmacsString } from '@/lib/ledger';
import { useLedgeStore } from '@/stores/ledges';

const store = useLedgeStore();
const status = ref(0);
const output = ref('');

function querySearch() {
  return store.bookmarks.map((value) => ({ value }));
}

const emacs = ref<{
  date: string,
  what: string,
  account: string,
  amount: string,
}[]>([]);
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
      emacs.value = parseEmacsString(text).flatMap(({ time, payee, postings }) => {
        const rows = postings.map(({ account, amount }) => ({ date: '', what: '', account, amount }));
        rows[0].date = new Date(time * 1000).toLocaleString();
        rows[0].what = payee;
        return rows;
      });
    } catch (e) {
      console.log('unexpected non-sexpr', text, e);
    }
  }
  output.value = text;
}
watch(store, update);
update();
</script>

<template>
  <ElCard>
    <ElForm>
      <ElFormItem label="Ledger Command">
        <ElAutocomplete
          v-model="store.command"
          :fetch-suggestions="querySearch"
          clearable
        />
      </ElFormItem>
      <ElFormItem label="Input">
        <ElInput v-model="store.input" type="textarea" autosize style="font-family: monospace;" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElTable v-show="emacs.length !== 0" :data="emacs">
        <el-table-column prop="date" label="Date" width="180" />
        <el-table-column prop="what" label="Payee" width="180" />
        <el-table-column prop="account" label="Account" />
        <el-table-column prop="amount" label="Amount" />
      </ElTable>
      <pre>{{ output }}</pre>
    </template>
  </ElCard>
</template>
