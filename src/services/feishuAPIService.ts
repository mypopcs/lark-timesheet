import axios from 'axios';
import type { LogEntry } from '../types';
import { useSettingsStore } from '../stores/settingsStore';
import { parseISO } from 'date-fns';
import { FEISHU_CONFIG } from '../config/constants';

const feishuApi = axios.create({ baseURL: FEISHU_CONFIG.BASE.baseURL });
const { appToken, tableId } = useSettingsStore().feishuConfig;
const BASE_API_URL = `/bitable/v1/apps/${appToken}/tables/${tableId}/records`;
const FEISHU_API_URL = {
  getURL: BASE_API_URL,
  batchCreateURL: `${BASE_API_URL}/batch_create`,
  batchUpdateURL: `${BASE_API_URL}/batch_update`
};

async function getTenantAccessToken(): Promise<string> {
  const settingsStore = useSettingsStore();
  const { appId, appSecret } = settingsStore.feishuConfig;
  if (!appId || !appSecret) throw new Error('飞书 App ID 或 App Secret 未配置。');
  const cacheKey = `feishu_token_${appId}`;
  const cachedData = sessionStorage.getItem(cacheKey);
  if (cachedData) {
    const { token, expiry } = JSON.parse(cachedData);
    if (Date.now() < expiry) return token;
  }
  try {
    const response = await feishuApi.post(FEISHU_CONFIG.BASE.postURL, {
      app_id: appId,
      app_secret: appSecret,
    });
    const data = response.data;
    if (data.code !== 0) throw new Error(`获取访问令牌失败: ${data.msg}`);
    const { tenant_access_token, expire } = data;
    const expiryTime = Date.now() + (expire - 600) * 1000;
    sessionStorage.setItem(cacheKey, JSON.stringify({ token: tenant_access_token, expiry: expiryTime }));
    return tenant_access_token;
  } catch (error) {
    console.error('请求飞书访问令牌时发生网络错误:', error);
    throw error;
  }
}

export function localToFeishuFields(localEntry: LogEntry): object {
    const dateTimeString = `${localEntry.date}T${localEntry.time}:00`;
    const dateForFeishu = parseISO(dateTimeString).getTime();

    return {
        [FEISHU_CONFIG.FIELDS.uuid]: localEntry.id, 
        [FEISHU_CONFIG.FIELDS.content]: localEntry.content,
        [FEISHU_CONFIG.FIELDS.type]: localEntry.type,
        [FEISHU_CONFIG.FIELDS.date]: dateForFeishu,
        [FEISHU_CONFIG.FIELDS.time]: localEntry.time,
        [FEISHU_CONFIG.FIELDS.week]: localEntry.week,
        [FEISHU_CONFIG.FIELDS.creatTime]: localEntry.creatTime,
        [FEISHU_CONFIG.FIELDS.status]: localEntry.syncStatus === 2 ? '本地已删除' : '已同步',
    };
}

export const feishuAPIService = {
  async getRecords(): Promise<any[]> {
    const accessToken = await getTenantAccessToken();
    try {
      const response = await feishuApi.get(FEISHU_API_URL.getURL, {
        params: { page_size: 500 },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.data.code !== 0) throw new Error(`获取飞书记录失败: ${response.data.msg}`);
      return response.data.data.items || [];
    } catch (error) {
      console.error('获取飞书记录时出错:', error);
      return [];
    }
  },

  async getTypes(): Promise<string[]> {
    const accessToken = await getTenantAccessToken();
    try {
        const response = await feishuApi.get(FEISHU_API_URL.getURL, {
            params: { page_size: 100 },
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.data.code !== 0) throw new Error(`获取字段列表失败: ${response.data.msg}`);
        const typeField = response.data.data.items.find((field: any) => field.field_name === FEISHU_CONFIG.FIELDS.type);
        if (typeField && typeField.property && typeField.property.options) {
            return typeField.property.options.map((option: any) => option.name);
        }
        return [];
    } catch (error) {
        console.error('获取飞书字段选项时出错:', error);
        return [];
    }
  },

  async batchCreateRecords(recordsToCreate: LogEntry[]): Promise<any[]> {
    const accessToken = await getTenantAccessToken();
    const records = recordsToCreate.map(entry => ({ fields: localToFeishuFields(entry) }));
    console.log('[调试] 准备批量创建:', records);
    const response = await feishuApi.post(FEISHU_API_URL.batchCreateURL, { records }, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (response.data.code !== 0) {
      console.error('批量创建失败，飞书返回的错误详情:', response.data);
      throw new Error(`批量创建飞书记录失败: ${response.data.msg}`);
    }
    return response.data.data.records;
  },

  async batchUpdateRecords(recordsToUpdate: { record_id: string; fields: object }[]): Promise<any[]> {
    const accessToken = await getTenantAccessToken();
    console.log('[调试] 准备批量更新:', recordsToUpdate);
    const response = await feishuApi.post(FEISHU_API_URL.batchUpdateURL, { records: recordsToUpdate }, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (response.data.code !== 0) {
      console.error('批量更新失败，飞书返回的错误详情:', response.data);
      throw new Error(`批量更新飞书记录失败: ${response.data.msg}`);
    }
    return response.data.data.records;
  },
};