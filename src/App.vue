<template>
  <div class="bg-gray-50 font-sans p-4 lg:p-4 min-h-screen select-none">
    <div class="max-w-full mx-auto">
      <HeaderControls
        v-model:searchTerm="searchTerm"
        v-model:selectedType="selectedType"
        v-model:currentDate="currentDate"
        :unique-types="logStore.uniqueTypes"
      >
        <button
          @click="isSettingsModalOpen = true"
          class="p-2 text-gray-600 hover:bg-gray-200 rounded-full"
          title="设置"
        >
          <Settings :size="20" />
        </button>
      </HeaderControls>
      <!-- 传递过滤后的日志条目 -->
      <CalendarGrid
        :entries="filteredLogs"
        :current-date="currentDate"
        @create-log="openLogModal(null)"
        @edit-log="openLogModal($event)"
      />
    </div>

    <SettingsModal
      :is-open="isSettingsModalOpen"
      :is-syncing="isSyncing"
      :sync-message="syncMessage"
      @close="isSettingsModalOpen = false"
      @synchronize="synchronize"
    />

    <!-- Other modals -->
    <LogModal
      :is-open="isModalOpen"
      :entry="selectedEntry"
      :available-types="logStore.availableTypes"
      @close="closeLogModal"
      @save="onSaveLog"
      @delete="onDeleteLog"
    />
    <ConfirmModal
      :is-open="uiStore.confirmState.isOpen"
      :title="uiStore.confirmState.title"
      :message="uiStore.confirmState.message"
      @confirm="uiStore.handleConfirm"
      @cancel="uiStore.handleCancel"
    />
    <div
      v-if="uiStore.tooltip.visible"
      :style="{ top: uiStore.tooltip.y + 'px', left: uiStore.tooltip.x + 'px' }"
      class="fixed p-2 bg-gray-800 text-white text-xs rounded-md shadow-lg z-50 pointer-events-none"
    >
      {{ uiStore.tooltip.content }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useLogStore } from "./stores/logStore";
import { useUiStore } from "./stores/uiStore";
import { useFeishuSync } from "./composables/useFeishuSync";
import type { LogEntry } from "./types";
import { Settings } from "lucide-vue-next";
import HeaderControls from "./components/HeaderControls.vue";
import CalendarGrid from "./components/CalendarGrid.vue";
import LogModal from "./components/LogModal.vue";
import SettingsModal from "./components/SettingsModal.vue";
import ConfirmModal from "./components/ConfirmModal.vue";

const logStore = useLogStore();
const uiStore = useUiStore();
const { isSyncing, syncMessage, synchronize, checkAutoSync } = useFeishuSync();

//组件挂载时执行
onMounted(() => {
  //获取日志数据
  logStore.fetchLogs().then(() => {
    checkAutoSync();
  });
  //获取可用的日志类型
  logStore.fetchAvailableTypes();
});

const currentDate = ref(new Date()); // 当前日期
const searchTerm = ref(""); // 搜索关键词
const selectedType = ref("all"); // 选中的日志类型
const isModalOpen = ref(false); // 控制日志模态框显示
const selectedEntry = ref<LogEntry | null>(null); // 当前选中的日志条目
const isSettingsModalOpen = ref(false); // 控制设置模态框显示

const filteredLogs = computed(() => {
  return logStore.visibleLogs.filter((entry) => {
    // 检查日志内容是否匹配搜索词
    const searchMatch = entry.content
      .toLowerCase()
      .includes(searchTerm.value.toLowerCase());
    // 检查日志类型是否匹配选中类型
    const typeMatch =
      selectedType.value === "all" || entry.type === selectedType.value;
    return searchMatch && typeMatch;
  });
});

const openLogModal = (entry: LogEntry | null) => {
  selectedEntry.value = entry;
  isModalOpen.value = true;
};
const closeLogModal = () => {
  isModalOpen.value = false;
  selectedEntry.value = null;
};
const onSaveLog = (data: Partial<LogEntry>) => {
  if (selectedEntry.value) {
    // 如果已存在日志条目，则更新
    logStore.updateLog(selectedEntry.value.id, data);
  } else {
    logStore.addLog(data as any);
  }
};
const onDeleteLog = (id: string) => {
  logStore.deleteLog(id);
};
</script>
