import { defineStore } from 'pinia';
import { format } from 'date-fns';
import type { FeishuApiConfig, SyncSettings } from '../types';

const FEISHU_CONFIG_KEY = 'feishu_api_config';
const SYNC_SETTINGS_KEY = 'feishu_sync_settings';

function getFromLocalStorage<T>(key: string, defaultValue: T): T {
  const storedValue = localStorage.getItem(key);
  if (storedValue) {
    try {
      return JSON.parse(storedValue) as T;
    } catch (error) {
      console.error(`解析localStorage中的键 "${key}" 失败:`, error);
      return defaultValue;
    }
  }
  return defaultValue;
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    feishuConfig: getFromLocalStorage<FeishuApiConfig>(FEISHU_CONFIG_KEY, {
      appId: import.meta.env.VITE_FEISHU_APP_ID || "",
      appSecret: import.meta.env.VITE_FEISHU_APP_SECRET || "",
      appToken: import.meta.env.VITE_FEISHU_APP_TOKEN || "",
      tableId: import.meta.env.VITE_FEISHU_TABLE_ID || "",
    }),
    syncSettings: getFromLocalStorage<SyncSettings>(SYNC_SETTINGS_KEY, {
      lastSyncTime: null,
      intervalHours: 8,
    }),
  }),
  getters: {
    isFeishuConfigured(state): boolean {
      const { appId, appSecret, appToken, tableId } = state.feishuConfig;
      return !!(appId && appSecret && appToken && tableId);
    },
    formattedLastSyncTime(state): string {
      const lastSync = state.syncSettings.lastSyncTime;
      if (!lastSync) {
        return "无";
      }
      try {
        // 将 ISO 格式字符串转换为 "MM/dd HH:mm" 格式
        return format(new Date(lastSync), "MM/dd HH:mm");
      } catch {
        return lastSync; // 如果格式化失败，返回原始字符串
      }
    },
  },
  actions: {
    saveFeishuConfig(newConfig: FeishuApiConfig) {
      this.feishuConfig = newConfig;
      localStorage.setItem(FEISHU_CONFIG_KEY, JSON.stringify(newConfig));
    },
    saveSyncSettings(newSettings: SyncSettings) {
      this.syncSettings = newSettings;
      localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(newSettings));
    },
    updateLastSyncTime(date: Date) {
      // ** 核心修正 **: 使用 ISO 8601 格式 (e.g., "2025-07-04T17:30:00.000Z")
      // 这种格式是标准化的，可以被 new Date() 和 parseISO() 轻松、无歧义地解析。
      this.syncSettings.lastSyncTime = date.toISOString();
      this.saveSyncSettings(this.syncSettings);
    },
  },
});
