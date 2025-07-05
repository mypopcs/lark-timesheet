/** * @file src/components/LogEntryItem.vue * @description 单个日志信息条 */
<template>
  <div
    class="w-full my-1 p-1 rounded-md cursor-pointer transition-all duration-200 ease-in-out hover:shadow-md flex justify-between items-center"
    :class="[color.bg, color.border, color.text]"
    v-tooltip="entry.content"
  >
    <!-- 左侧内容 -->
    <div class="flex-1 text-xs flex items-center overflow-hidden">
      <span class="text-gray-500 font-mono mr-1 text-[10px]">{{
        entry.time
      }}</span>
      <span class="font-semibold truncate">{{ entry.content }}</span>
    </div>
    <!-- 右侧标签 -->
    <span
      class="ml-2 px-1.5 py-0.5 rounded text-white text-[10px] whitespace-nowrap"
      :class="color.tagBg"
    >
      {{ entry.type }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import type { LogEntry, ColorTheme } from "../types";

//定义组件数据字段
defineProps({
  entry: {
    type: Object as PropType<LogEntry>,
    required: true,
  },
  color: {
    type: Object as PropType<ColorTheme>,
    required: true,
  },
});
</script>
