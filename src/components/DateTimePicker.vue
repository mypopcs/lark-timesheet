<template>
  <div class="bg-white border border-gray-200 rounded-lg flex h-[260px] mt-1">
    <div class="p-2 grow">
      <div class="flex items-center justify-between mb-3">
        <button
          type="button"
          @click="prevMonth"
          class="p-1 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft :size="20" />
        </button>
        <span class="font-semibold text-gray-800 text-sm">{{
          format(viewDate, "yyyy年 M月")
        }}</span>
        <button
          type="button"
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
      <div class="grid grid-cols-7 gap-1">
        <button
          type="button"
          v-for="day in calendarDays"
          :key="day.toISOString()"
          @click="selectDate(day)"
          class="w-8 h-8 flex items-center justify-center rounded-sm text-sm transition-colors"
          :class="{
            'text-gray-400': !isSameMonth(day, viewDate),
            'hover:bg-gray-100': isSameMonth(day, viewDate),
            'hover:text-gray-800': isSameMonth(day, viewDate),
            'bg-blue-600 text-white hover:bg-blue-700': isSameDay(
              day,
              selectedDate
            ),
            'border-b-2 border-blue-600':
              isSameDay(day, new Date()) && !isSameDay(day, selectedDate),
          }"
        >
          {{ format(day, "d") }}
        </button>
      </div>
    </div>
    <div class="flex flex-col grow border-l border-gray-200">
      <span
        class="text-center font-semibold text-gray-800 my-3 mb-2.5 text-sm w-full"
        >时间</span
      >
      <div class="flex overflow-hidden w-full">
        <div class="flex-1 overflow-y-auto scrollbar-thin grow">
          <div
            v-for="hour in hourOptions"
            :key="`h-${hour}`"
            @click="selectTime('hour', hour)"
            class="text-sm p-1 text-center rounded-sm cursor-pointer hover:bg-gray-100 hover:text-gray-800"
            :class="{ 'bg-blue-600 text-white': selectedHour === hour }"
          >
            {{ hour.toString().padStart(2, "0") }}
          </div>
        </div>
        <div class="flex-1 overflow-y-auto scrollbar-thin grow">
          <div
            v-for="minute in 60"
            :key="`m-${minute - 1}`"
            @click="selectTime('minute', minute - 1)"
            class="text-sm p-1 text-center rounded-sm cursor-pointer hover:bg-blue-100 hover:text-gray-800"
            :class="{
              'bg-blue-600 text-white': selectedMinute === minute - 1,
            }"
          >
            {{ (minute - 1).toString().padStart(2, "0") }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  subMonths,
  addMonths,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";

const props = defineProps({
  modelValue: { type: Date, required: true },
});

const emit = defineEmits(["update:modelValue"]);

// --- 状态 ---
const selectedDate = ref(new Date(props.modelValue));
const viewDate = ref(new Date(props.modelValue));

// --- 计算属性 ---
const selectedHour = computed(() => getHours(selectedDate.value));
const selectedMinute = computed(() => getMinutes(selectedDate.value));

const calendarDays = computed(() => {
  const monthStart = startOfMonth(viewDate.value);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(endOfMonth(monthStart));
  return eachDayOfInterval({ start: startDate, end: endDate });
});

const hourOptions = computed(() => Array.from({ length: 16 }, (_, i) => i + 8));

// --- 方法 ---
const prevMonth = () => (viewDate.value = subMonths(viewDate.value, 1));
const nextMonth = () => (viewDate.value = addMonths(viewDate.value, 1));

const selectDate = (day: Date) => {
  const newDate = setMinutes(
    setHours(day, selectedHour.value),
    selectedMinute.value
  );
  selectedDate.value = newDate;
};

const selectTime = (unit: "hour" | "minute", value: number) => {
  if (unit === "hour") {
    selectedDate.value = setHours(selectedDate.value, value);
  } else {
    selectedDate.value = setMinutes(selectedDate.value, value);
  }
};

// --- 侦听器 ---
watch(selectedDate, (newDate) => {
  emit("update:modelValue", newDate);
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal.getTime() !== selectedDate.value.getTime()) {
      selectedDate.value = new Date(newVal);
      // 当外部传入新值时，也更新视图的月份
      viewDate.value = new Date(newVal);
    }
  }
);
</script>

<style>
/* 滚动条样式保持不变 */
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #c7c7c7;
  border-radius: 4px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #a3a3a3;
}
</style>
