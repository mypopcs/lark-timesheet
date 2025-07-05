<template>
  <header
    class="mb-2 flex flex-wrap items-center justify-between gap-4 md:flex-nowrap"
  >
    <div class="flex flex-wrap items-center gap-3">
      <div class="relative" ref="dropdownRef">
        <button
          @click="isDropdownOpen = !isDropdownOpen"
          class="text-lg font-bold text-gray-800 focus:ring-blue-500 flex items-center"
        >
          <span>{{ selectedType === "all" ? "全部分类" : selectedType }}</span>
          <ChevronDown
            :size="16"
            class="ml-2 transition-transform duration-200"
            :class="{ 'transform rotate-180': isDropdownOpen }"
          />
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
            v-if="isDropdownOpen"
            class="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
          >
            <ul class="py-1">
              <li>
                <button
                  @click="selectType('all')"
                  class="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100"
                  :class="{
                    'bg-blue-100 text-blue-700 font-bold':
                      selectedType === 'all',
                  }"
                >
                  全部分类
                </button>
              </li>
              <li v-for="type in uniqueTypes" :key="type">
                <button
                  @click="selectType(type)"
                  class="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100"
                  :class="{
                    'bg-blue-100 text-blue-700 font-bold':
                      selectedType === type,
                  }"
                >
                  {{ type }}
                </button>
              </li>
            </ul>
          </div>
        </transition>
      </div>

      <div class="relative">
        <Search
          :size="18"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="搜索日志内容..."
          :value="searchTerm"
          @input="
            emit('update:searchTerm', ($event.target as HTMLInputElement).value)
          "
          class="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <WeekDatePicker
        :modelValue="currentDate"
        @update:modelValue="emit('update:currentDate', $event)"
      />
    </div>
    <div class="flex items-center gap-2 md:ml-auto">
      <p class="text-xs text-gray-400">
        每<span class="px-1 font-bold text-blue-500">{{
          settingsStore.syncSettings.intervalHours
        }}</span
        >小时自动同步，上次同步：<span class="font-bold">{{
          settingsStore.formattedLastSyncTime || "未同步"
        }}</span>
      </p>
      <slot></slot>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Search, ChevronDown } from "lucide-vue-next";
import { onClickOutside } from "@vueuse/core";
import WeekDatePicker from "./WeekDatePicker.vue";
import { useSettingsStore } from "../stores/settingsStore";

defineProps<{
  searchTerm: string;
  selectedType: string;
  currentDate: Date;
  uniqueTypes: string[];
}>();

const emit = defineEmits([
  "update:searchTerm",
  "update:selectedType",
  "update:currentDate",
]);
const settingsStore = useSettingsStore();

const isDropdownOpen = ref(false);
const dropdownRef = ref(null);
onClickOutside(dropdownRef, () => {
  isDropdownOpen.value = false;
});
const selectType = (type: string) => {
  emit("update:selectedType", type);
  isDropdownOpen.value = false;
};
</script>
