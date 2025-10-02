<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { VTextarea, VTextField } from 'vuetify/components';
import { useConfirm, useSnackbar } from 'vuetify-use-dialog';

import { DATA_DIR } from '@/lib/ledger-config';
import { useLedgerFS } from '@/lib/ledger-web';

interface Tree {
  id: string;
  label: string;
  children?: Tree[];
}

const files = ref<Tree[]>([]);
const confirm = useConfirm();
const toast = useSnackbar();

async function updateFiles() {
  const fs = await useLedgerFS();
  files.value = [{
    id: DATA_DIR,
    label: DATA_DIR,
    children: readNested(DATA_DIR),
  }];
  function readNested(path: string) {
    const children = fs.readdir(path);
    return children.filter((s) => s !== '.' && s !== '..').map((child) => {
      const full = `${path}/${child}`;
      const entry: Tree = {
        id: full,
        label: child,
      };
      if (fs.isDir(fs.stat(full).mode)) {
        entry.label += '/';
        entry.children = readNested(full);
      }
      return entry;
    });
  }
}
onMounted(updateFiles);

async function withErrorMessage(f: () => Promise<void>) {
  try {
    await f();
  } catch (e) {
    toast({ text: `${JSON.stringify(e)}` });
  }
}
function prompt(title: string, label: string, value?: string) {
  return new Promise<string>((accept, reject) => {
    const v = ref(value ?? '');
    confirm({
      title,
      contentComponent: VTextField,
      contentComponentProps: {
        label,
        'modelValue': value,
        'onUpdate:modelValue': (text: string) => v.value = text,
      },
    }).then((confirmed) => {
      if (confirmed) {
        accept(v.value);
      } else {
        reject('Cancelled');
      }
    });
  });
}
async function createFile(data: Tree, folder: boolean) {
  const fileName = prompt('', 'File Name?');
  try {
    const path = `${data.id}/${(await fileName)}`;
    withErrorMessage(async () => {
      const fs = await useLedgerFS();
      if (folder) {
        fs.mkdir(path);
      } else {
        fs.writeFile(path, '');
      }
    });
  } catch (e) {
    toast({ text: `${e}` });
  }
  updateFiles();
}
async function editFile(data: Tree) {
  const fs = await useLedgerFS();
  const content = ref(new TextDecoder().decode(fs.readFile(data.id)));
  const confirmed = await confirm({
    title: data.id,
    contentComponent: VTextarea,
    contentComponentProps: {
      'autoGrow': true,
      'rows': 8,
      'maxRows': 16,
      'modelValue': content.value,
      'onUpdate:modelValue': (v: string) => content.value = v,
    },
  });
  if (confirmed) {
    withErrorMessage(async () => {
      fs.writeFile(data.id, content.value);
    });
  }
}
async function renameFile(data: Tree) {
  const fileName = prompt('', 'New File Name?', data.id);
  try {
    const path = await fileName;
    withErrorMessage(async () => {
      const fs = await useLedgerFS();
      fs.rename(data.id, path);
    });
  } catch (e) {
    toast({ text: `${e}` });
  }
  updateFiles();
}
async function deleteFile(data: Tree, rmdir: boolean) {
  const { id: path } = data;
  const result = await confirm({
    title: 'Delete?',
    content: `File: ${path}`,
  });
  if (result) {
    const fs = await useLedgerFS();
    if (rmdir) {
      const recursive = fs.readdir(path).filter(
        (f) => f !== '.' && f !== '..',
      ).length !== 0 && await confirm({
        title: 'Delete?',
        content: `Directory \`${path}' not empty. Delete recursively?`,
      });
      if (recursive) {
        async function deleteDeep(file: string) {
          console.log(file);
          if (fs.isDir(fs.stat(file).mode)) {
            fs.readdir(file).filter((f) => f !== '.' && f !== '..')
              .forEach((f) => deleteDeep(`${file}/${f}`));
            fs.rmdir(file);
          } else {
            fs.unlink(file);
          }
        }
        withErrorMessage(async () => deleteDeep(path));
      } else {
        withErrorMessage(async () => fs.rmdir(path));
      }
    } else {
      withErrorMessage(async () => fs.unlink(path));
    }
  }
  updateFiles();
}
</script>

<template>
  <v-card>
    <v-treeview :items="files"
      open-all open-on-click hide-actions indent-lines="default"
      item-value="id" item-title="label"
      style="margin: 1em 2em;"
      >
      <template #prepend="{ item, isOpen }">
        <v-icon :icon="item.children ? (isOpen ? 'mdi-folder-open' : 'mdi-folder') : 'mdi-note-text'" />
      </template>
      <template v-slot:append="{ item }">
        <!-- TODO: Alt texts are all icons / icon buttons. -->
        <v-icon-btn icon="mdi-note-plus" @click="createFile(item, false)" v-if="item.children" />
        <v-icon-btn icon="mdi-folder-plus" @click="createFile(item, true)" v-if="item.children" />
        <v-icon-btn icon="mdi-pencil-box-outline" @click="editFile(item)" v-if="!item.children" />
        <v-icon-btn icon="mdi-rename" @click="renameFile(item)" v-if="!item.children" />
        <v-icon-btn icon="mdi-delete" @click="deleteFile(item, !!item.children)" v-if="item.id !== DATA_DIR" />
      </template>
    </v-treeview>
  </v-card>
</template>
