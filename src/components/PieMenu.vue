<script setup lang="ts">
import { circleInRect, positiveAngleDelta, lesserAngleDelta } from '@/lib/math';
import { AnimatePresence, Motion } from 'motion-v';
import { computed, ref } from 'vue';

export interface MenuItem {
  id: string | number;
  label: string;
  children: MenuItem[];
}

const size = 50;
function allocCoordinates(
  x: number, y: number, r: number, cr: number, count: number,
): [number, number][] {
  let prevAngles: number[] | null = null;
  let angles: number[] = [];
  for (let i = 0; i < 72; i++) {
    const angle = (Math.PI * 2 / 72) * i;
    const cx = x + r * Math.cos(angle);
    const cy = y + r * Math.sin(angle);
    if (circleInRect(cx, cy, cr, window.innerWidth, window.innerHeight)) {
      angles.push(angle);
    } else if (angles.length !== 0) {
      prevAngles = angles;
      angles = [];
    }
  }
  if (prevAngles !== null) {
    angles.push(...prevAngles);
  }
  let centerAngle;
  if (angles.length % 2 == 1) {
    centerAngle = angles[(angles.length - 1) / 2];
  } else {
    const left = angles[angles.length / 2 - 1];
    const right = angles[angles.length / 2];
    centerAngle = lesserAngleDelta(right, left) / 2 + left;
  }
  const range = positiveAngleDelta(angles[angles.length - 1], angles[0]);
  const anglePer = 2 * Math.asin(cr / r);
  count = Math.min(count, Math.floor(range / (anglePer * 1.1)));
  const step = range / count;
  const pre = step / 2;
  angles = Array.from({ length: count }).map(
    (_, i) => centerAngle - range / 2 + pre + step * i,
  );
  return angles.map((a) => [x + r * Math.cos(a) - cr, y + r * Math.sin(a) - cr]);
}

const props = defineProps<{
  menu: MenuItem[];
}>();

interface Button {
  id: string | number;
  label: string;
  coord: [number, number];
  action: (event: MouseEvent) => void;
}
const ongoing = ref(false);
const path = ref<number[]>([]);
const nextButtons = ref<Button[]>([]);
function computeNextButtons(event: MouseEvent, active?: MenuItem[], offset?: number) {
  active = active ?? [...path.value.reduce((node, i) => node[i].children, props.menu)];
  offset = offset ?? 0;

  let updated = false;
  function pathUpdater(add: number | 'pop', end?: boolean) {
    return (event: MouseEvent) => {
      if (updated) {
        return;
      }
      updated = true;
      if (add === 'pop') {
        path.value = path.value.slice(0, path.value.length - 1);
      } else {
        path.value = [...path.value, add];
      }
      if (end) {
        endMenuNavigation();
      } else {
        nextButtons.value = computeNextButtons(event);
      }
    };
  }

  const buttons: Button[] = [];
  const back = path.value.length !== 0;
  const { clientX: x, clientY: y } = event;
  const needs = (back ? 1 : 0) + active.length;
  const coords = allocCoordinates(x, y, size * 1.5, size / 2, needs);
  const rest = coords.length === needs ? null : active.splice(coords.length - buttons.length - 1);
  if (back) {
    buttons.push({
      id: '←', label: '←', coord: coords.pop()!,
      action: pathUpdater('pop'),
    });
  }
  buttons.push(...active.map(({ label, id, children }, i) => ({
    id, label, coord: coords[i], action: pathUpdater(i + offset, children.length === 0),
  })));
  if (rest !== null) {
    const offset = active.length;
    buttons.push({ id: '…', label: '…', coord: coords[coords.length - 1], action: (event) => {
      if (updated) {
        return;
      }
      updated = true;
      nextButtons.value = computeNextButtons(event, rest, offset);
    } });
  }
  return buttons;
}

function startMenuNavigation(event: MouseEvent) {
  document.body.style.overflow = 'hidden';
  ongoing.value = true;
  nextButtons.value = computeNextButtons(event);
}
function endMenuNavigation() {
  ongoing.value = false;
  document.body.style.overflow = 'auto';
}
const activePath = computed(() => {
  const names: string[] = [];
  path.value.reduce((menu, i) => {
    names.push(menu[i].label);
    return menu[i].children!;
  }, props.menu);
  return names;
});
</script>

<template>
  <div class="pie-menu" :style="{ '--button-size': `${size}px` }">
    <AnimatePresence>
      <Motion as="button"
        v-show="!ongoing"
        class="pie-shard"
        key="start"
        :initial="{ opacity: 1, scale: 1 }"
        :hover="{ scale: 1.2 }"
        :exit="{ opacity: 0, scale: 0 }"
        @press-start="startMenuNavigation"
        >
        <v-icon icon="mdi-pencil" />
        <span>{{ activePath[activePath.length - 1] ?? '' }}</span>
      </Motion>
    </AnimatePresence>
    <v-overlay v-model="ongoing" @click:outside="endMenuNavigation"
      :style="{ '--button-size': `${size}px` }">
      <AnimatePresence>
        <Motion as="button"
          v-for="item in nextButtons"
          :key="`pie-${item.id}`" :data-key="item.id"
          class="pie-sharder pie-shard"
          :style="{
            top: `${item.coord[1]}px`,
            left: `${item.coord[0]}px`,
          }"
          :initial="{ scale: 0, rotate: 90, borderRadius: 0 }"
          :animate="{ scale: 1, rotate: 0, borderRadius: size / 10 }"
          :exit="{ scale: 0, rotate: 90, borderRadius: 0 }"
          v-show="ongoing"
          @mouseenter="(event) => item.action(event)"
          >
          {{ item.label }}
        </Motion>
      </AnimatePresence>
    </v-overlay>
  </div>
  <v-breadcrumbs :items="activePath" />
</template>

<style scoped>
.pie-menu {
  width: calc(2 * var(--button-size));
  height: calc(2 * var(--button-size));
  padding: calc(var(--button-size) / 2);
  overflow: clip;
  position: relative;
}
.pie-shard {
  background-color: gainsboro;
  border: 2px saddlebrown solid;
  width: var(--button-size);
  height: var(--button-size);
  text-wrap: wrap;
  word-wrap: anywhere;
  line-height: 1;
  overflow: hidden;
  font-size: 0.8em;
}
.pie-sharder {
  position: fixed;
  display: block;
  transform: translate(-50%, -50%);
  z-index: 3000;
}
</style>
