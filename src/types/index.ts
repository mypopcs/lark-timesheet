// --- 类型定义 (Types) ---
export interface LogEntry {
  id: string;
  content: string;
  date: string | number; // 支持字符串和时间戳
  time: string; // HH:mm
  type: string;
  status: "未同步" | "已同步" | "本地删除";
  createdAt: string; // ISO 8601
}

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  appToken: string;
  tableId: string;
  syncInterval: number; // in hours
}

export interface ColorTheme {
  bg: string;
  text: string;
  tagBg: string;
  border: string;
}

export interface ColorMap {
  [key: string]: ColorTheme;
}

export interface TooltipState {
  entry: LogEntry;
  x: number;
  y: number;
}
