/**
 * @file src/types/index.ts
 * @description typescript 数据结构和类型定义文件
 */

//单条工作日志记录
export interface LogEntry {
  id: string; // 本地生成的唯一ID (例如 UUID)
  record_id?: string; // 对应飞书多维表格的 record_id，用于同步
  content: string; // 日志内容
  type: string; // 类型（标签）
  date: string; // 日志记录日期 (ISO 8601 格式, e.g., "2025-06-17T09:15:00.000Z")
  time: string; // 日志记录时间
  week: string; // 星期几
  creatTime: number; // 最后修改时间的时间戳，用于同步冲突处理
  syncStatus: 0 | 1 | 2; // 数据同步状态: 0(未同步), 1(已同步), 2(本地删除)
}
//同步状态枚举
export const SyncStatus = {
  UNSYNCED: 0,
  SYNCED: 1,
  DELETED: 2,
} as const;
//飞书API配置信息
export interface FeishuApiConfig {
  appId: string; //飞书应用的appId
  appSecret: string; //飞书应用的appSecret
  appToken: string; //多维表格的token
  tableId: string; //多维表格的id
}
//同步设置
export interface SyncSettings {
  lastSyncTime: string | null; //上一次同步时间
  intervalHours: number; //同步间隔时间（小时）
}
//主题配置
export interface ColorTheme {
  bg: string; //信息条背景色
  text: string; //内容文字颜色
  subtext: string; // (可选) 辅助文字颜色，比 text 浅
  tagBg: string; //标签背景色，比bg深
  border: string; //信息条边框颜色
}
//类型到颜色的映射表
export interface ColorMap {
  [key: string]: ColorTheme;
}

//tooltips状态
export interface TooltipState {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}
//确认弹窗状态
export interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void; // 当用户点击“确定”时要执行的回调函数
}
