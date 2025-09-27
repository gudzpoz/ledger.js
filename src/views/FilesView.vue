<script setup lang="ts">
import { newInstance, DATA_DIR } from '@/lib/ledger';
import { ElInput, ElMessage, ElMessageBox } from 'element-plus';
import { h, onMounted, ref } from 'vue';
import {
  DocumentAdd, FolderAdd, Delete,
  Document, Folder, FolderOpened,
  Edit, Scissor,
 } from '@element-plus/icons-vue';

interface Tree {
  id: string,
  label: string,
  children?: Tree[],
}

const files = ref<Tree[]>([]);
const useFS = newInstance().then((ledger) => ledger.FS());

async function updateFiles() {
  const fs = await useFS;
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
    ElMessage({ type: 'error', message: `${JSON.stringify(e)}` });
  }
}
async function createFile(data: Tree, folder: boolean) {
  const fileName = ElMessageBox.prompt('', 'File Name?');
  try {
    const path = `${data.id}/${(await fileName).value}`;
    withErrorMessage(async () => {
      const fs = await useFS;
      if (folder) {
        fs.mkdir(path);
      } else {
        fs.writeFile(path, '');
      }
    });
  } catch (e) {
    ElMessage({ type: 'info', message: `${e}` });
  }
  updateFiles();
}
async function editFile(data: Tree) {
  const fs = await useFS;
  const content = ref(new TextDecoder().decode(fs.readFile(data.id)));
  try {
    await ElMessageBox({
      title: 'Editor',
      customClass: 'editor',
      message: () => h(
        ElInput,
        {
          type: 'textarea',
          autosize: { minRows: 8, maxRows: 16 },
          modelValue: content.value,
          'onUpdate:modelValue': (v) => content.value = v,
        },
      ),
    });
    withErrorMessage(async () => {
      fs.writeFile(data.id, content.value);
    });
  } catch (e) {
    ElMessage({ type: 'info', message: `${e}` });
  }
}
async function renameFile(data: Tree) {
  const fileName = ElMessageBox.prompt('', 'New File Name?', {
    inputValue: data.id,
  });
  try {
    const path = await fileName;
    withErrorMessage(async () => {
      const fs = await useFS;
      fs.rename(data.id, path.value);
    });
  } catch (e) {
    ElMessage({ type: 'info', message: `${e}` });
  }
  updateFiles();
}
async function deleteFile(data: Tree) {
  const result = await ElMessageBox.confirm(`File: ${data.id}`, 'Delete?');
  if (result) {
    const fs = await useFS;
    withErrorMessage(async () => fs.unlink(data.id));
  }
  updateFiles();
}
</script>

<template>
  <ElCard>
    <ElTree :data="files" style="--el-tree-node-content-height: 3em"
     highlight-current default-expand-all>
      <template #default="{ node, data }">
        <div class="file">
          <div class="info">
            <ElIcon size="20">
              <Document v-if="node.isLeaf" />
              <Folder v-else-if="!node.expanded" />
              <FolderOpened v-else />
            </ElIcon>
            <span>{{ data.label }}</span>
          </div>
          <div class="action">
            <ElButton type="success" @click="createFile(data, false)" v-if="data.children">
              <ElIcon><DocumentAdd /></ElIcon>
            </ElButton>
            <ElButton type="success" @click="createFile(data, true)" v-if="data.children">
              <ElIcon><FolderAdd /></ElIcon>
            </ElButton>
            <ElButton type="primary" @click="editFile(data)" v-if="!data.children">
              <ElIcon><Edit /></ElIcon>
            </ElButton>
            <ElButton type="primary" @click="renameFile(data)" v-if="!data.children">
              <ElIcon><Scissor /></ElIcon>
            </ElButton>
            <ElButton type="danger" @click="deleteFile(data)" v-if="data.id !== DATA_DIR">
              <ElIcon><Delete /></ElIcon>
            </ElButton>
          </div>
        </div>
      </template>
    </ElTree>
  </ElCard>
</template>

<style>
.file {
  flex: 1;
  justify-content: space-between;
  font-size: 14px;
  padding-right: 4em;
}
.file, .file > * {
  display: flex;
  align-items: center;
}
.file .info > * {
  font-size: 1.2em;
  margin-right: 0.5em;
}
.editor .el-message-box__container {
  display: block;
}
</style>
