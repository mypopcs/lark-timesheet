/** * @file src/components/CalendarGrid.vue * @description 日历组件 */
<template>
  <main class="bg-white border border-gray-200 rounded-lg shadow-sm">
    <div
      class="grid"
      :style="{
        gridTemplateColumns: '3rem repeat(7, minmax(8rem, auto))',
      }"
    >
      <!-- 创建按钮 -->
      <div class="p-2 border-b border-r">
        <button
          @click="emit('create-log')"
          class="w-full h-full flex items-center justify-center text-yellow-600 hover:text-yellow-700 transition-colors"
          title="创建新日志"
        >
          <PlusCircle :size="24" />
        </button>
      </div>
      <!-- 横轴日期 -->
      <div
        v-for="day in weekDays"
        :key="day.toISOString()"
        class="p-2 text-center border-b border-r transition-colors"
        :class="{ 'bg-blue-100 text-blue-800 font-bold': isToday(day) }"
      >
        <!-- 日期 -->
        <span class="text-sm text-gray-600">{{ format(day, "M/d ") }}</span>
        <!-- 星期 -->
        <span class="text-xs text-gray-400">
          {{ format(day, "EEE", { locale: zhCN }) }}
        </span>
      </div>

      <template v-for="hour in timeLabels" :key="hour">
        <div
          class="col-start-1 border-r border-b border-gray-200 min-h-[2.5rem] flex items-start justify-center pt-1"
        >
          <span class="text-xs text-gray-500 -mt-1">{{ hour }}:00</span>
        </div>
        <div
          v-for="day in weekDays"
          :key="day.toISOString() + hour"
          class="col-auto border-r border-b border-gray-200 p-1 min-h-[2.5rem] overflow-y-auto transition-colors"
          :class="{ 'bg-blue-50': isToday(day) }"
        >
          <LogEntryItem
            v-for="entry in getEntriesForCell(day, hour)"
            :key="entry.id"
            :entry="entry"
            :color="themeStore.getColorForType(entry.type)"
            @click="emit('edit-log', entry)"
          />
        </div>
      </template>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import type { PropType } from "vue";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useThemeStore } from "../stores/themeStore";
import type { LogEntry } from "../types";
import { PlusCircle } from "lucide-vue-next";
import LogEntryItem from "./LogEntryItem.vue";

// 定义组件 props
const props = defineProps({
  entries: {
    type: Array as PropType<LogEntry[]>,
    required: true,
  },
  currentDate: {
    type: Date,
    required: true,
  },
});

// 定义组件emit事件，分别为创建日志和编辑日志
const emit = defineEmits(["create-log", "edit-log"]);

// 主题颜色配置
const themeStore = useThemeStore();
// --- 调试代码 ---
// 监听传入的 entries prop，确认子组件是否收到了数据
watch(
  () => props.entries,
  (newEntries) => {
    console.log(
      `[调试] CalendarGrid.vue: 检测到 'entries' prop 更新，共`,
      newEntries.length,
      "条记录。"
    );
  },
  { deep: true }
);
// 定义一周的开始时间
const weekStart = computed(() =>
  startOfWeek(props.currentDate, { weekStartsOn: 0 })
);
// 定义一周
const weekDays = computed(() =>
  Array.from({ length: 7 }).map((_, i) => addDays(weekStart.value, i))
);

// 定义左侧时间轴的时间字段的自增方法
const timeLabels = computed(() =>
  Array.from({ length: 17 }).map((_, i) => `${i + 8}`)
);
// 定义今天的判断
const isToday = (day: Date): boolean => isSameDay(day, new Date());

/**
 * 根据指定的日期和时间获取对应的日志条目
 * @param day - 日期对象，表示要查询的日期
 * @param hour - 字符串形式的小时数（如"08"表示8点）
 * @returns 返回匹配的日志条目数组，按时间排序
 */
const getEntriesForCell = (day: Date, hour: string): LogEntry[] => {
  const dayStr = format(day, "yyyy-MM-dd");
  const hourNum = parseInt(hour, 10);

  const filtered = props.entries.filter((entry) => {
    // --- 调试代码 ---
    // 检查每个 entry 的数据格式和比较结果
    if (!entry.date || !entry.time) {
      console.warn(
        "[调试] CalendarGrid.vue: 发现不完整的日志条目，已跳过:",
        entry
      );
      return false;
    }
    const entryHour = parseInt(entry.time.split(":")[0], 10);
    const dateMatch = entry.date === dayStr;
    const hourMatch = entryHour === hourNum;

    // 只在日期匹配时打印，避免日志过多
    // if (dateMatch) {
    //   console.log(
    //     `[调试] CalendarGrid.vue: 正在检查单元格 ${dayStr} - ${hourNum}:00`,
    //     {
    //       日志日期: entry.date,
    //       日志时间: entry.time,
    //       日志小时: entryHour,
    //       日期是否匹配: dateMatch,
    //       小时是否匹配: hourMatch,
    //       日志内容: entry.content,
    //     }
    //   );
    // }

    return dateMatch && hourMatch;
  });

  // if (filtered.length > 0) {
  //   console.log(
  //     `%c[调试] CalendarGrid.vue: 单元格 ${dayStr} - ${hourNum}:00 匹配到 ${filtered.length} 条数据!`,
  //     "color: green",
  //     filtered
  //   );
  // }

  return filtered.sort((a, b) => a.time.localeCompare(b.time));
};
</script>
