<script setup lang="ts">
import { ref, watch } from 'vue';

import { newInstance } from '@/lib/ledger';
import parseSexpr from '@/lib/emacs';
import { useLedgeStore } from '@/stores/ledges';

const store = useLedgeStore();
const status = ref(0);
const output = ref('');

function querySearch() {
  return store.bookmarks.map((value) => ({ value }));
}

async function update() {
  const { command, input } = store;
  const ledger = await newInstance();
  const result = ledger.run(
    command.split(/\s+/).filter((s) => !!s),
    input,
  );
  status.value = result.status;
  let text = result.stdout === '' ? result.stderr : result.stdout;
  if (text.startsWith('(')) {
    try {
      text += '\n' + JSON.stringify(parseSexpr(text), null, 2);
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
      <pre>{{ output }}</pre>
      <ElText :type="status === 0 ? 'primary' : 'danger'">exit({{ status }})</ElText>
    </template>
  </ElCard>
</template>
