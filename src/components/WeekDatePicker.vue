<template>
  <div class="flex items-center">
    <button
      @click="prevWeek"
      class="px-2 py-1.5 text-gray-600 bg-white border border-r-0 border-gray-300 rounded-l-md hover:bg-gray-100"
      aria-label="上一周"
    >
      <ChevronLeft :size="20" />
    </button>
    <div class="relative" ref="pickerRef">
      <button
        @click="togglePicker"
        class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 flex items-center"
        style="width: fit-content"
      >
        <span class="whitespace-nowrap">
          {{ weekDisplay }}
        </span>
      </button>

      <transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <div
          v-if="isOpen"
          class="absolute top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-10 p-4"
        >
          <div class="flex items-center justify-between mb-3">
            <button
              @click="prevMonth"
              class="p-1 rounded-full hover:bg-gray-100"
            >
              <ChevronLeft :size="20" />
            </button>
            <span class="font-semibold text-gray-800">{{
              format(viewDate, "yyyy年 M月")
            }}</span>
            <button
              @click="nextMonth"
              class="p-1 rounded-full hover:bg-gray-100"
            >
              <ChevronRight :size="20" />
            </button>
          </div>

          <div
            class="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2"
          >
            <div
              v-for="dayName in ['日', '一', '二', '三', '四', '五', '六']"
              :key="dayName"
            >
              {{ dayName }}
            </div>
          </div>

          <div class="space-y-1">
            <div
              v-for="(week, i) in calendarRows"
              :key="i"
              @mouseenter="hoveredWeek = week[0]"
              @mouseleave="hoveredWeek = null"
              @click="handleSelectWeek(week[0])"
              class="flex justify-around rounded-md cursor-pointer transition-colors duration-150"
              :class="{
                'bg-blue-100': isWeekSelected(week[0]),
                'bg-gray-100':
                  !isWeekSelected(week[0]) && isWeekHovered(week[0]),
              }"
            >
              <div
                v-for="day in week"
                :key="day.toISOString()"
                class="w-9 h-9 flex items-center justify-center rounded-lg text-sm"
                :class="{
                  'text-gray-300': !isSameMonth(day, viewDate),
                  'text-gray-700': isSameMonth(day, viewDate),
                  'border border-blue-500': isSameDay(day, new Date()),
                  'bg-blue-600 text-white':
                    isSameDay(day, modelValue) && isSameMonth(day, viewDate),
                }"
              >
                {{ format(day, "d") }}
              </div>
            </div>
          </div>

          <div class="border-t mt-4 pt-2">
            <button
              @click="handleSelectWeek(new Date())"
              class="w-full text-center text-sm text-blue-600 hover:font-semibold"
            >
              今天
            </button>
          </div>
        </div>
      </transition>
    </div>

    <button
      @click="nextWeek"
      class="px-2 py-1.5 text-gray-600 bg-white border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-100"
      aria-label="下一周"
    >
      <ChevronRight :size="20" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  format,
  startOfWeek,
  endOfWeek,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  subMonths,
  addMonths,
  isSameWeek,
  subWeeks,
  addWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { onClickOutside } from "@vueuse/core";

const props = defineProps({
  modelValue: { type: Date, required: true },
});

const emit = defineEmits(["update:modelValue"]);

// --- 状态管理 ---
const isOpen = ref(false); // 控制弹窗的显示/隐藏
const viewDate = ref(new Date(props.modelValue)); // 弹窗中日历当前显示的月份
const hoveredWeek = ref<Date | null>(null); // 鼠标悬停的周
const pickerRef = ref(null); // 用于获取弹窗的 DOM 引用
const weekStartsOn = 0; // 周日作为一周的开始

// --- 外部点击关闭 ---
onClickOutside(pickerRef, () => (isOpen.value = false));

// --- 计算属性 ---
// 1:1 还原 React 的 useMemo 逻辑，计算日历的行和列
const calendarRows = computed(() => {
  const monthStart = startOfMonth(viewDate.value);
  const monthEnd = endOfMonth(viewDate.value);
  const startDate = startOfWeek(monthStart, { weekStartsOn });
  const endDate = endOfWeek(monthEnd, { weekStartsOn });
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const rows = [];
  for (let i = 0; i < days.length; i += 7) {
    rows.push(days.slice(i, i + 7));
  }
  return rows;
});

// 计算主按钮上显示的周范围文本
const weekDisplay = computed(() => {
  const start = startOfWeek(props.modelValue, { weekStartsOn });
  const end = endOfWeek(props.modelValue, { weekStartsOn });
  return `${format(start, "yyyy/M/d")} - ${format(end, "M/d")}`;
});

// --- 事件处理 ---
const prevWeek = () => emit("update:modelValue", subWeeks(props.modelValue, 1));
const nextWeek = () => emit("update:modelValue", addWeeks(props.modelValue, 1));
const prevMonth = () => (viewDate.value = subMonths(viewDate.value, 1));
const nextMonth = () => (viewDate.value = addMonths(viewDate.value, 1));

const togglePicker = () => {
  // 每次打开时，都重置日历的视图到当前选中的日期所在的月份
  if (!isOpen.value) {
    viewDate.value = new Date(props.modelValue);
  }
  isOpen.value = !isOpen.value;
};

// 选中一周后的处理逻辑
const handleSelectWeek = (weekStartDate: Date) => {
  emit("update:modelValue", weekStartDate);
  isOpen.value = false; // 选中后自动关闭弹窗
};

// --- 样式判断函数 ---
const isWeekSelected = (weekStartDate: Date) =>
  isSameWeek(weekStartDate, props.modelValue, { weekStartsOn });
const isWeekHovered = (weekStartDate: Date) =>
  hoveredWeek.value
    ? isSameWeek(weekStartDate, hoveredWeek.value, { weekStartsOn })
    : false;
</script>
