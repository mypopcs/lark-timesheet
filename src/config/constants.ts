// config/constants.ts

// 字段映射配置
export const FEISHU_CONFIG = {
  FIELDS: {
    uuid: 'uuid',
    content: '内容',
    type: '类型',
    date: '日期',
    time: '时间',
    week: '星期',
    creatTime: '创建时间',
    status: '状态',
  },
  BASE: {
    baseURL: '/feishu',
    postURL: '/auth/v3/tenant_access_token/internal',
  },
  WEEK_DAYS: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const,
  //默认分页大小
  PAGE_SIZE: {
    normal: 500,
    forTypes: 100,
  },
  ERROR_MESSAGES: {
    noAppConfig: '飞书 App ID 或 App Secret 未配置。',
    tokenFailed: '获取访问令牌失败',
    requestFailed: '请求飞书接口失败',
  },
} as const;

// 本地数据库配置
export const DB_CONFIG = {
  dbName: 'WorkLogDatabase',
  dbVersion: 1,
  storeName: 'logs',
  AVAILABLE_TYPES_KEY : 'log_available_types' // 日志类型缓存键
} as const;

// 一周的天
export const WEEK_DAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;