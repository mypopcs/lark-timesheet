<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50"
  >
    <div
      ref="modalContent"
      class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative"
    >
      <button
        @click="closeModal"
        class="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
      >
        <X :size="24" />
      </button>

      <h2 class="text-xl font-bold mb-2">API 与同步设置</h2>
      <p class="text-sm text-gray-500 mb-6">
        请在此配置飞书多维表格的 API 信息及同步周期。
      </p>

      <form @submit.prevent="handleSave">
        <div class="space-y-4">
          <div>
            <label for="appId" class="block text-sm font-medium text-gray-700"
              >App ID</label
            >
            <input
              id="appId"
              type="text"
              v-model="formData.appId"
              placeholder="请输入 App ID"
              class="form-input"
            />
          </div>
          <div>
            <label
              for="appSecret"
              class="block text-sm font-medium text-gray-700"
              >App Secret</label
            >
            <input
              id="appSecret"
              type="password"
              v-model="formData.appSecret"
              placeholder="请输入 App Secret"
              class="form-input"
            />
          </div>
          <div>
            <label
              for="appToken"
              class="block text-sm font-medium text-gray-700"
              >App Token (Base Token)</label
            >
            <input
              id="appToken"
              type="text"
              v-model="formData.appToken"
              placeholder="请输入多维表格的 Token"
              class="form-input"
            />
          </div>
          <div>
            <label for="tableId" class="block text-sm font-medium text-gray-700"
              >Table ID</label
            >
            <input
              id="tableId"
              type="text"
              v-model="formData.tableId"
              placeholder="请输入 Table ID"
              class="form-input"
            />
          </div>
          <div>
            <label
              for="intervalHours"
              class="block text-sm font-medium text-gray-700"
              >同步周期 (小时)</label
            >
            <input
              id="intervalHours"
              type="number"
              v-model.number="formData.intervalHours"
              min="1"
              class="form-input"
            />
          </div>
        </div>
        <div class="mt-6 flex w-full flex-col gap-2">
          <button
            type="button"
            @click="handleSave"
            class="px-4 py-2 bg-blue-600 text-sm text-white rounded-md hover:bg-blue-700 flex-grow"
            :disabled="!hasChanges"
          >
            保存配置
          </button>
          <button
            @click="emit('synchronize')"
            :disabled="isSyncing"
            class="items-center px-4 py-2 bg-green-600 text-sm text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
          >
            <span>立即同步</span>
            <span>{{ " — " + settingsStore.formattedLastSyncTime || "" }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useSettingsStore } from "../stores/settingsStore";
import { X } from "lucide-vue-next";
import { onClickOutside } from "@vueuse/core";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  isSyncing: { type: Boolean, default: false },
  syncMessage: { type: String, default: "" },
});

const emit = defineEmits(["close", "synchronize"]);

const settingsStore = useSettingsStore();
const modalContent = ref(null);

const formData = ref({
  appId: "",
  appSecret: "",
  appToken: "",
  tableId: "",
  intervalHours: 24,
});
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      formData.value = {
        ...settingsStore.feishuConfig,
        intervalHours: settingsStore.syncSettings.intervalHours,
      };
    }
  },
  { immediate: true }
);

const hasChanges = computed(() => {
  return (
    formData.value.appId !== settingsStore.feishuConfig.appId ||
    formData.value.appSecret !== settingsStore.feishuConfig.appSecret ||
    formData.value.appToken !== settingsStore.feishuConfig.appToken ||
    formData.value.tableId !== settingsStore.feishuConfig.tableId ||
    formData.value.intervalHours !== settingsStore.syncSettings.intervalHours
  );
});

const closeModal = () => emit("close");
onClickOutside(modalContent, closeModal);

const handleSave = () => {
  settingsStore.saveFeishuConfig({
    appId: formData.value.appId,
    appSecret: formData.value.appSecret,
    appToken: formData.value.appToken,
    tableId: formData.value.tableId,
  });
  settingsStore.saveSyncSettings({
    ...settingsStore.syncSettings,
    intervalHours: formData.value.intervalHours,
  });

  alert("配置已保存！");
};
</script>
