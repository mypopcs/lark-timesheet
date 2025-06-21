import type { LogEntry, FeishuConfig } from "../types";

const baseUrl = "/feishu";

export const feishuAPIService = {
  // 动态获取类型列表
  getTypes: async (config: FeishuConfig): Promise<string[]> => {
    if (
      !config.appId ||
      !config.appSecret ||
      !config.appToken ||
      !config.tableId
    ) {
      console.warn("飞书配置不完整，跳过获取类型。");
      return [];
    }

    try {
      const token = await getAccessToken(config);
      const response = await fetch(
        `${baseUrl}/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/fields`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );

      if (!response.ok) {
        console.error(`获取字段列表失败: HTTP ${response.status}`);
        return [];
      }

      const data = await response.json();

      if (data.code !== 0) {
        console.error(`获取字段列表失败: ${data.msg} (错误码: ${data.code})`);
        return [];
      }

      const typeField = data.data.items.find(
        (field: any) => field.field_name === "类型"
      );

      if (typeField && typeField.property && typeField.property.options) {
        const options = typeField.property.options.map(
          (option: any) => option.name
        );
        return options;
      }

      console.warn("未在飞书表格中找到'类型'字段或其选项。");
      return [];
    } catch (error) {
      console.error("获取飞书字段类型时出错:", error);
      return [];
    }
  },

  // 获取飞书表格数据
  getRecords: async (config: FeishuConfig): Promise<LogEntry[]> => {
    const token = await getAccessToken(config);
    const response = await fetch(
      `${baseUrl}/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json",
        },
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`获取表格数据失败: ${data.msg} (错误码: ${data.code})`);
    }
    if (!data.data || !data.data.items) return [];
    return data.data.items.map((item: any) => {
      const fields = item.fields;
      // 日期字段兼容字符串和时间戳，统一转为yyyy/MM/dd字符串
      let dateValue = fields["日期"];
      let dateStr = "";
      if (typeof dateValue === "number") {
        const d = new Date(dateValue);
        dateStr = `${d.getFullYear()}/${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
      } else if (typeof dateValue === "string") {
        dateStr = dateValue.replace(/-/g, "/");
      } else {
        dateStr = "";
      }
      // time字段兼容数组和字符串
      let timeValue = fields["时间"];
      let timeStr = "";
      if (Array.isArray(timeValue)) {
        timeStr = timeValue[0]?.text || timeValue[0] || "";
      } else if (typeof timeValue === "string") {
        timeStr = timeValue;
      } else {
        timeStr = "";
      }
      return {
        id: item.record_id,
        content: fields["内容"] || "",
        date: typeof dateStr === "string" ? dateStr : "",
        time: typeof timeStr === "string" ? timeStr : "",
        type: fields["类型"] || "",
        status: fields["状态"] || "已同步",
        createdAt: fields["创建时间"] || new Date().toISOString(),
      };
    });
  },

  // 同步本地数据到飞书表格（全量覆盖：先删除再新增）
  syncRecords: async (
    config: FeishuConfig,
    localData: LogEntry[]
  ): Promise<boolean> => {
    const token = await getAccessToken(config);
    // 1. 获取所有远程记录ID
    const response = await fetch(
      `${baseUrl}/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json",
        },
      }
    );
    if (!response.ok)
      throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
    const data = await response.json();
    if (data.code !== 0)
      throw new Error(`获取表格数据失败: ${data.msg} (错误码: ${data.code})`);
    const remoteIds = (data.data.items || []).map(
      (item: any) => item.record_id
    );
    // 2. 删除所有远程记录
    for (const id of remoteIds) {
      await fetch(
        `${baseUrl}/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=utf-8",
            Accept: "application/json",
          },
        }
      );
    }
    // 3. 批量新增本地数据
    for (const entry of localData) {
      await fetch(
        `${baseUrl}/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=utf-8",
            Accept: "application/json",
          },
          body: JSON.stringify({
            fields: {
              内容: entry.content,
              日期: entry.date,
              时间: entry.time,
              类型: entry.type,
              状态: entry.status,
              创建时间: entry.createdAt,
            },
          }),
        }
      );
    }
    return true;
  },

  // 新增记录
  createRecord: async (
    config: FeishuConfig,
    entry: LogEntry
  ): Promise<string> => {
    const token = await getAccessToken(config);
    // 日期字段转为时间戳
    let dateValue = entry.date;
    if (typeof dateValue === "string") {
      dateValue = new Date(dateValue).getTime();
    } else if (typeof dateValue !== "number") {
      dateValue = Date.now();
    }
    let timeStr = typeof entry.time === "string" ? entry.time : "";
    console.log("[DEBUG][createRecord] 写入飞书字段:", {
      内容: entry.content,
      日期: dateValue,
      时间: timeStr,
      类型: entry.type,
      状态: entry.status,
      创建时间: entry.createdAt,
      原始日期: entry.date,
      原始时间: entry.time,
      日期类型: typeof dateValue,
      时间类型: typeof timeStr,
    });
    const fieldsObj: Record<string, any> = {
      内容: entry.content,
      日期: dateValue,
      时间: timeStr,
      类型: entry.type,
      状态: entry.status,
      创建时间: entry.createdAt,
    };
    const headersObj = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
    };
    const bodyObj = { fields: fieldsObj };
    console.log("[DEBUG][createRecord] 请求headers:", headersObj);
    console.log("[DEBUG][createRecord] 请求body:", bodyObj);
    let response, data;
    try {
      response = await fetch(
        `${baseUrl}/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records`,
        {
          method: "POST",
          headers: headersObj,
          body: JSON.stringify(bodyObj),
        }
      );
      data = await response.json();
      console.log("[DEBUG][createRecord] 响应:", data);
    } catch (err) {
      console.error("[DEBUG][createRecord] fetch异常:", err);
      throw err;
    }
    if (data.code !== 0) {
      console.error("[DEBUG][createRecord] 响应错误:", data);
      throw new Error(`创建记录失败: ${data.msg} (错误码: ${data.code})`);
    }
    return data.data.record.record_id;
  },

  // 更新记录
  updateRecord: async (
    config: FeishuConfig,
    entry: LogEntry
  ): Promise<void> => {
    const token = await getAccessToken(config);
    // updateRecord同理
    let dateValue2 = entry.date;
    if (typeof dateValue2 === "string") {
      dateValue2 = new Date(dateValue2).getTime();
    } else if (typeof dateValue2 !== "number") {
      dateValue2 = Date.now();
    }
    let timeStr2 = typeof entry.time === "string" ? entry.time : "";
    console.log("[DEBUG][updateRecord] 写入飞书字段:", {
      内容: entry.content,
      日期: dateValue2,
      时间: timeStr2,
      类型: entry.type,
      状态: entry.status,
      创建时间: entry.createdAt,
      原始日期: entry.date,
      原始时间: entry.time,
      日期类型: typeof dateValue2,
      时间类型: typeof timeStr2,
    });
    const fieldsObj2: Record<string, any> = {
      内容: entry.content,
      日期: dateValue2,
      时间: timeStr2,
      类型: entry.type,
      状态: entry.status,
      创建时间: entry.createdAt,
    };
    const headersObj2 = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
    };
    const bodyObj2 = { fields: fieldsObj2 };
    console.log("[DEBUG][updateRecord] 请求headers:", headersObj2);
    console.log("[DEBUG][updateRecord] 请求body:", bodyObj2);
    let response2, data2;
    try {
      response2 = await fetch(
        `${baseUrl}/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records/${entry.id}`,
        {
          method: "PUT",
          headers: headersObj2,
          body: JSON.stringify(bodyObj2),
        }
      );
      data2 = await response2.json();
      console.log("[DEBUG][updateRecord] 响应:", data2);
    } catch (err) {
      console.error("[DEBUG][updateRecord] fetch异常:", err);
      throw err;
    }
    if (data2.code !== 0) {
      console.error("[DEBUG][updateRecord] 响应错误:", data2);
      throw new Error(`更新记录失败: ${data2.msg} (错误码: ${data2.code})`);
    }
  },

  // 批量更新记录状态
  batchUpdateStatus: async (
    config: FeishuConfig,
    records: { id: string; status: string }[]
  ): Promise<void> => {
    const token = await getAccessToken(config);
    const requests = records.map((record) => ({
      record_id: record.id,
      fields: {
        状态: record.status,
      },
    }));

    const response = await fetch(
      `${baseUrl}/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records/batch_update`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ records: requests }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[DEBUG][batchUpdateStatus] 响应错误:", errorText);
      throw new Error(`批量更新状态失败: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      console.error("[DEBUG][batchUpdateStatus] 响应错误:", data);
      throw new Error(`批量更新状态失败: ${data.msg} (错误码: ${data.code})`);
    }
  },
};

// 获取访问令牌
export async function getAccessToken(config: FeishuConfig): Promise<string> {
  // 本地缓存token和过期时间
  const cacheKey = `feishu_token_${config.appId}`;
  const cache = sessionStorage.getItem(cacheKey);
  if (cache) {
    const { token, expiry } = JSON.parse(cache);
    if (Date.now() < expiry) return token;
  }
  const response = await fetch(
    `${baseUrl}/auth/v3/tenant_access_token/internal`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
      body: JSON.stringify({
        app_id: config.appId,
        app_secret: config.appSecret,
      }),
    }
  );
  if (!response.ok)
    throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
  const data = await response.json();
  if (data.code !== 0)
    throw new Error(`获取访问令牌失败: ${data.msg} (错误码: ${data.code})`);
  if (!data.tenant_access_token)
    throw new Error("获取访问令牌失败: 返回的令牌为空");
  // 令牌有效期通常2小时，提前10分钟刷新
  const expiry = Date.now() + (data.expire - 600) * 1000;
  sessionStorage.setItem(
    cacheKey,
    JSON.stringify({ token: data.tenant_access_token, expiry })
  );
  return data.tenant_access_token;
}
