<script setup lang="ts">
import newInstance from '@/lib/ledger';
import { ref, watch } from 'vue';
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
  output.value = result.stdout === '' ? result.stderr : result.stdout;
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
        <ElInput v-model="store.input" type="textarea" :autosize="true" style="font-family: monospace;" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <pre>{{ output }}</pre>
      <ElText :type="status === 0 ? 'primary' : 'danger'">exit({{ status }})</ElText>
    </template>
  </ElCard>
</template>
