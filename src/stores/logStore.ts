import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import { getDay } from 'date-fns';
import type { LogEntry } from '../types';
import { useThemeStore } from './themeStore';
import { dbService } from '../services/dbService';
import { feishuAPIService } from '../services/feishuAPIService';
import { useSettingsStore } from './settingsStore';
import { WEEK_DAYS,DB_CONFIG } from '../config/constants';

export const useLogStore = defineStore('logs', {
  state: () => ({
    logs: [] as LogEntry[],
    isLoading: false,
    availableTypes: JSON.parse(localStorage.getItem(DB_CONFIG.AVAILABLE_TYPES_KEY) || '[]') as string[],
  }),
  getters: {
    uniqueTypes(state): string[] {
      const typesFromLogs = new Set(state.logs.map(log => log.type));
      const allTypes = new Set([...typesFromLogs, ...state.availableTypes]);
      return Array.from(allTypes);
    },
    visibleLogs: (state): LogEntry[] => state.logs.filter(log => log.syncStatus !== 2),
  },
  actions: {
    async fetchLogs() {
      this.isLoading = true;
      try {
        this.logs = await dbService.getAllLogs();
        useThemeStore().generateColorMap(this.uniqueTypes);
      } catch (error) { 
        console.error("加载日志失败:", error);
      } finally { 
        this.isLoading = false; 
      }
    },
    
    /**
     * @description 获取可用的“类型”选项。
     * 优先使用本地持久化的数据，仅在特定条件下才从飞书获取。
     */
    async fetchAvailableTypes() {
      // ** 核心修正：严格按照您的要求，添加上层判断 **
      // 1. 如果本地已经有类型数据 (从localStorage加载的)，则直接使用，不执行任何API调用。
      if (this.availableTypes.length > 0) {
        console.log("检测到本地已存在类型选项，直接使用本地缓存。");
        return;
      }
      
      // 2. 如果本地没有数据，再判断API是否配置
      const settingsStore = useSettingsStore();
      if (!settingsStore.isFeishuConfigured) {
          console.log("API未配置，且本地无类型缓存，使用默认值。");
          this.availableTypes = ['常规', '重要', '紧急', '个人'];
          return;
      }
      
      // 3. 只有在本地无数据且API已配置的情况下，才执行API调用
      try {
          console.log("本地无类型数据，正在从飞书获取...");
          const types = await feishuAPIService.getTypes();
          if (types.length > 0) {
              this.availableTypes = types;
              localStorage.setItem(DB_CONFIG.AVAILABLE_TYPES_KEY, JSON.stringify(types));
              console.log("成功从飞书获取类型并已本地存储:", types);
          } else {
              console.warn("飞书未返回任何类型选项，使用默认值。");
              this.availableTypes = ['常规', '重要', '紧急', '个人'];
          }
      } catch (error) {
          console.error("从飞书获取可用类型失败，使用默认值:", error);
          this.availableTypes = ['常规', '重要', '紧急', '个人'];
      }
    },
    
    async addLog(data: Omit<LogEntry, 'id' | 'week' | 'creatTime' | 'syncStatus'>) {
      const newLog: LogEntry = {
        ...data,
        id: uuidv4(),
        week: WEEK_DAYS[getDay(new Date(data.date))],
        creatTime: Date.now(),
        syncStatus: 0, 
      };
      await dbService.saveLog(newLog);
      this.logs.push(newLog);
      useThemeStore().generateColorMap(this.uniqueTypes);
    },
    async updateLog(id: string, updatedData: Partial<Omit<LogEntry, 'id'>>) {
      const index = this.logs.findIndex(log => log.id === id);
      if (index !== -1) {
        // 先创建一个纯净的、非响应式的对象副本
        const cleanLog = JSON.parse(JSON.stringify(this.logs[index]));
        // 在该副本上应用更新
        const logToUpdate = { ...cleanLog, ...updatedData, creatTime: Date.now() };
        // 如果外部没有指定 syncStatus，则默认为 0 (未同步)
        if (updatedData.syncStatus === undefined) { 
          logToUpdate.syncStatus = 0;
        }
        await dbService.saveLog(logToUpdate); // 保存纯净的对象到数据库
        this.logs[index] = logToUpdate; // 更新 Pinia state
        useThemeStore().generateColorMap(this.uniqueTypes);
      }
    },
    async deleteLog(id: string) {
      const index = this.logs.findIndex(log => log.id === id);
      if (index !== -1) {
        // 使用 JSON.parse(JSON.stringify()) 创建一个纯净的对象副本以存入 IndexedDB
        const logToDelete = JSON.parse(JSON.stringify(this.logs[index]));
        logToDelete.syncStatus = 2; // 标记为本地删除
        logToDelete.creatTime = Date.now();

        await dbService.saveLog(logToDelete); // 保存回数据库
        this.logs[index] = logToDelete; // 更新 Pinia state
      }
    },
    async batchAddOrUpdateLogs(logsToAdd: LogEntry[]) {
      for (const log of logsToAdd) {
        await dbService.saveLog(log);
      }
    },
    async batchDeleteLogs(logIdsToDelete: string[]) {
      for (const id of logIdsToDelete) {
        await dbService.deleteLogDB(id);
      }
    },
  },
});
