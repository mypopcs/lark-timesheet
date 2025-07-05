<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50"
  >
    <div
      ref="modalContent"
      class="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl relative transform transition-all"
    >
      <button
        @click="closeModal"
        class="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
      >
        <X :size="24" />
      </button>

      <h2 class="text-xl font-bold mb-6">
        {{ isCreating ? "创建新日志" : "编辑日志" }}
      </h2>

      <form @submit.prevent="handleSave">
        <div class="grid md:grid-cols-9 gap-6">
          <div class="space-y-4 md:col-span-5">
            <div>
              <label
                for="log-content"
                class="block text-sm font-medium text-gray-700"
                >内容</label
              >
              <textarea
                id="log-content"
                v-model="formData.content"
                rows="4"
                required
                class="mt-1 text-sm block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700"
                >日期和时间</label
              >
              <span
                class="pl-2 text-sm font-semibold text-gray-800 font-mono"
                >{{ formattedDateTimeForDisplay }}</span
              >
              <DateTimePicker v-model="formDateTime" />
            </div>
          </div>

          <div class="space-y-4 md:col-span-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >类型</label
              >
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="typeOption in availableTypes"
                  :key="typeOption"
                  class="inline-flex items-center px-3.5 py-2 rounded-md text-sm cursor-pointer border"
                  :class="{
                    'bg-blue-100 border-blue-500 text-blue-700':
                      formData.type === typeOption,
                    'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100':
                      formData.type !== typeOption,
                  }"
                >
                  <input
                    type="radio"
                    v-model="formData.type"
                    :value="typeOption"
                    class="sr-only"
                    required
                  />
                  {{ typeOption }}
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-8 flex gap-3 w-full">
          <button
            v-if="!isCreating"
            @click="handleDelete"
            type="button"
            class="px-4 py-2 bg-red-600 text-sm text-white rounded-md hover:bg-red-700 flex-grow"
          >
            删除
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-sm text-white rounded-md flex-grow"
            :disabled="!hasChanges"
            :class="{
              'opacity-50 cursor-not-allowed': !hasChanges,
              'hover:bg-blue-700': hasChanges,
            }"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { PropType } from "vue";
import { format, parse } from "date-fns";
import type { LogEntry } from "../types";
import { X } from "lucide-vue-next";
import { onClickOutside } from "@vueuse/core";
import { useUiStore } from "../stores/uiStore";
import DateTimePicker from "./DateTimePicker.vue";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  entry: { type: Object as PropType<LogEntry | null>, default: null },
  availableTypes: {
    type: Array as PropType<string[]>,
    default: () => ["常规"],
  },
});

const emit = defineEmits(["close", "save", "delete"]);
const uiStore = useUiStore();

const modalContent = ref<HTMLElement | null>(null);
const isCreating = computed(() => !props.entry);

const originalState = ref<
  Omit<LogEntry, "id" | "week" | "creatTime" | "syncStatus" | "record_id">
>({ content: "", type: "", date: "", time: "" });
const formData = ref({ content: "", type: "" });
const formDateTime = ref(new Date());
const formattedDateTimeForDisplay = computed(() => {
  return format(formDateTime.value, "yyyy/MM/dd HH:mm");
});

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) return;

    if (props.entry) {
      const initialState = {
        content: props.entry.content,
        type: props.entry.type,
        date: props.entry.date,
        time: props.entry.time,
      };
      originalState.value = { ...initialState };
      formData.value = {
        content: initialState.content,
        type: initialState.type,
      };
      // ** 核心修正 **: 使用与存储时一致的 `yyyy-MM-dd` 格式来解析
      formDateTime.value = parse(
        `${initialState.date} ${initialState.time}`,
        "yyyy-MM-dd HH:mm",
        new Date()
      );
    } else {
      const now = new Date();
      const initialState = {
        content: "",
        type: props.availableTypes[0] || "",
        date: format(now, "yyyy-MM-dd"),
        time: format(now, "HH:mm"),
      };
      originalState.value = { ...initialState };
      formData.value = {
        content: initialState.content,
        type: initialState.type,
      };
      formDateTime.value = now;
    }
  },
  { immediate: true }
);

const hasChanges = computed(() => {
  const currentDateStr = format(formDateTime.value, "yyyy-MM-dd");
  const currentTimeStr = format(formDateTime.value, "HH:mm");

  return (
    formData.value.content !== originalState.value.content ||
    formData.value.type !== originalState.value.type ||
    currentDateStr !== originalState.value.date ||
    currentTimeStr !== originalState.value.time
  );
});

const closeModal = () => emit("close");
onClickOutside(modalContent, closeModal);

const handleSave = () => {
  if (!hasChanges.value) return;
  if (!formData.value.content || !formData.value.type) {
    alert("内容和类型不能为空！");
    return;
  }
  emit("save", {
    content: formData.value.content,
    type: formData.value.type,
    date: format(formDateTime.value, "yyyy-MM-dd"),
    time: format(formDateTime.value, "HH:mm"),
  });
  closeModal();
};

const handleDelete = () => {
  const entryIdToDelete = props.entry?.id;
  if (!entryIdToDelete) {
    return;
  }
  uiStore.showConfirm({
    title: "确定要删除日志吗？",
    message: "该记录将会不再显示，同步后该记录将被彻底删除。",
    onConfirm: () => {
      emit("delete", entryIdToDelete);
      closeModal();
    },
  });
};
</script>
