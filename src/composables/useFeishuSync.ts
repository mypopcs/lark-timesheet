import { ref } from 'vue';
import { useLogStore } from '../stores/logStore';
import { useSettingsStore } from '../stores/settingsStore';
import { feishuAPIService,localToFeishuFields  } from '../services/feishuAPIService';
import type { LogEntry } from '../types';
import { SyncStatus } from '../types';
import { FEISHU_CONFIG } from '../config/constants';
import { format } from 'date-fns'; //导入日期格式化工具
import { v4 as uuidv4 } from 'uuid'; //导入UUID生成器
/**
 * 将飞书记录转换为本地日志条目格式
 * @param feishuRecord 飞书记录对象
 * @returns 转换后的本地日志条目
 */
function feishuToLocal(feishuRecord: any): LogEntry {
  const fields = feishuRecord.fields;// 获取飞书记录字段
  const date = fields[FEISHU_CONFIG.FIELDS.date] ? format(new Date(fields[FEISHU_CONFIG.FIELDS.date]), 'yyyy/MM/dd') : ''; // 处理日期字段，格式化为yyyy/MM/dd
  const typeValue = fields[FEISHU_CONFIG.FIELDS.type]; // 处理类型字段（飞书可能是数组形式）
  const type = Array.isArray(typeValue) ? typeValue[0] : (typeValue || '常规');
  const weekValue = fields[FEISHU_CONFIG.FIELDS.week];// 处理星期字段（飞书可能是数组形式）
  const week = Array.isArray(weekValue) ? weekValue[0] : (weekValue || '');
  //返回转换后的本地日志
  return {
    id: fields[FEISHU_CONFIG.FIELDS.uuid] || uuidv4(),  //使用飞书的UUID或生成新UUID
    record_id: feishuRecord.record_id, //飞书ID
    content: fields[FEISHU_CONFIG.FIELDS.content] || '',
    type: type,
    date: date,
    time: fields[FEISHU_CONFIG.FIELDS.time] || '',
    week: week,
    creatTime: fields[FEISHU_CONFIG.FIELDS.creatTime] || Date.now(), //创建时间
    syncStatus: SyncStatus.SYNCED,
  };
}
/**
 * 飞书同步功能组合式函数
 */
export function useFeishuSync() {
  const logStore = useLogStore();//日志状态管理
  const settingsStore = useSettingsStore();//设置状态管理
  const isSyncing = ref(false);//同步状态标识
  const syncMessage = ref('');//同步消息
  //执行同步操作
  async function synchronize() {
    // 如果正在同步或飞书未配置，则直接返回
    if (isSyncing.value || !settingsStore.isFeishuConfigured) {
      syncMessage.value = isSyncing.value ? '正在同步中...' : 'API未配置，无法同步';
      setTimeout(() => syncMessage.value = '', 3000);
      return;
    }

    isSyncing.value = true;
    syncMessage.value = '开始同步...';
    console.log('%c[同步开始]', 'color: blue; font-weight: bold;');

    try {
      syncMessage.value = '正在获取飞书数据...';
      const remoteRecords = await feishuAPIService.getRecords();
      await logStore.fetchLogs();
      const localLogs = [...logStore.logs];
      console.log('[调试] 获取到远程记录:', remoteRecords);
      console.log('[调试] 获取到本地记录:', localLogs);
      
      const localLogMap = new Map(localLogs.map(log => [log.id, log]));
      const remoteRecordMap = new Map(
        remoteRecords
          .filter(rec => rec.fields && rec.fields[FEISHU_CONFIG.FIELDS.uuid])
          .map(rec => [rec.fields[FEISHU_CONFIG.FIELDS.uuid], rec])
      );

      const toUpload: LogEntry[] = [];
      const toDownload: LogEntry[] = [];
      const toUpdateOnFeishu: { record_id: string, fields: object }[] = [];
      const toPermanentlyDeleteLocally: string[] = [];

      syncMessage.value = '正在比对数据...';

      for (const localLog of localLogs) {
        const remoteMatch = remoteRecordMap.get(localLog.id);
        if (remoteMatch) {
          // 如果记录在本地被修改 (标记为未同步)，则加入更新队列
          if (localLog.syncStatus === SyncStatus.UNSYNCED) {
            toUpdateOnFeishu.push({
              record_id: remoteMatch.record_id,
              fields: localToFeishuFields(localLog),
            });
          } 
          // 如果记录在本地被删除
          else if (localLog.syncStatus === SyncStatus.DELETED) {
            toUpdateOnFeishu.push({ record_id: remoteMatch.record_id, fields: localToFeishuFields(localLog) });
            toPermanentlyDeleteLocally.push(localLog.id);
          }
        } else {
          if (localLog.syncStatus === SyncStatus.UNSYNCED) toUpload.push(localLog);
          else if (localLog.syncStatus === SyncStatus.SYNCED) toPermanentlyDeleteLocally.push(localLog.id);
        }
      }

      for (const remoteRecord of remoteRecords) {
        const remoteUUID = remoteRecord.fields[FEISHU_CONFIG.FIELDS.uuid];
        
        if (!remoteUUID) {
            const newLocalEntry = feishuToLocal(remoteRecord);
            toDownload.push(newLocalEntry);
            // 回写飞书时，同时更新 uuid 和 status **
            toUpdateOnFeishu.push({
                record_id: remoteRecord.record_id,
                fields: { 
                  [FEISHU_CONFIG.FIELDS.uuid]: newLocalEntry.id,
                  [FEISHU_CONFIG.FIELDS.status]: '已同步',
                }
            });
            continue;
        }

        const localMatch = localLogMap.get(remoteUUID);
        const remoteStatus = remoteRecord.fields[FEISHU_CONFIG.FIELDS.status];
        if (!localMatch) {
          if (remoteStatus !== '本地已删除') toDownload.push(feishuToLocal(remoteRecord));
        } else {
            if (remoteStatus === '本地已删除' && localMatch.syncStatus === SyncStatus.DELETED) {
                toPermanentlyDeleteLocally.push(localMatch.id);
            }
        }
      }

      console.log('%c[执行计划]', 'color: green; font-weight: bold;', { toUpload, toUpdateOnFeishu, toDownload, toPermanentlyDeleteLocally });
      syncMessage.value = '正在执行操作...';
      if (toUpload.length > 0) await feishuAPIService.batchCreateRecords(toUpload);
      if (toUpdateOnFeishu.length > 0) await feishuAPIService.batchUpdateRecords(toUpdateOnFeishu);
      if (toDownload.length > 0) await logStore.batchAddOrUpdateLogs(toDownload);
      if (toPermanentlyDeleteLocally.length > 0) await logStore.batchDeleteLogs(toPermanentlyDeleteLocally);
      
      await logStore.fetchLogs();
      settingsStore.updateLastSyncTime(new Date());
      syncMessage.value = `同步成功！`;
      console.log('%c[同步成功]', 'color: blue; font-weight: bold;');

    } catch (error: any) {
      console.error('同步过程中发生错误:', error);
      syncMessage.value = `同步失败: ${error.message}`;
    } finally {
      isSyncing.value = false;
      setTimeout(() => syncMessage.value = '', 5000);
    }
  }
  
  function checkAutoSync() {
    const { lastSyncTime, intervalHours } = settingsStore.syncSettings;
    //从未同步过立即触发
    if (!lastSyncTime) {
      console.log('从未同步过，执行首次同步');
      synchronize();
      return
    }
    //之前同步过，检查时间间隔是否已到
    try {
      const lastSyncDate = new Date(lastSyncTime);
      const now = new Date();
      // 将小时转换为毫秒
      const intervalMillis = intervalHours * 60 * 60 * 1000;
      const timeSinceLastSync = now.getTime() - lastSyncDate.getTime();

      // 如果经过的时间大于或等于设定的间隔，则触发同步
      if (timeSinceLastSync >= intervalMillis) {
        console.log(`%c[自动同步] 同步周期 (${intervalHours}小时) 已到，执行同步。`, "color: green");
        synchronize();
      } else {
        console.log(`[自动同步] 同步周期未到，跳过。下次同步大约在 ${new Date(lastSyncDate.getTime() + intervalMillis).toLocaleTimeString()} 之后。`);
      }
    } catch (error) {
        console.error("[自动同步] 解析上次同步时间时出错，请检查。错误:", error);
    }
  }

  return { isSyncing, syncMessage, synchronize, checkAutoSync };
}
