import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  PlusCircle,
  Search,
  Minimize,
  Fullscreen,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  subWeeks,
  addWeeks,
  isSameDay,
  parse,
  getDay,
  getHours,
} from "date-fns";

// 导入拆分后的模块
import { THEME_COLORS } from "./config/theme";
import type { LogEntry, FeishuConfig, ColorMap, TooltipState } from "./types";
import { MOCK_LOG_ENTRIES } from "./data/mock";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { feishuAPIService } from "./services/feishuAPI";
import { LogEntryItem } from "./components/LogEntryItem";
import { Tooltip } from "./components/Tooltip";
import { LogModal } from "./components/LogModal";
import { SettingsModal } from "./components/SettingsModal";
import { CustomDatePicker } from "./components/CustomDatePicker";

const App: React.FC = () => {
  // --- 状态管理 ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [logEntries, setLogEntries] = useLocalStorage<LogEntry[]>(
    "log_data",
    MOCK_LOG_ENTRIES.map((e) => ({ ...e, status: "已同步" }))
  );
  const [feishuConfig, setFeishuConfig] = useLocalStorage<FeishuConfig>(
    "feishu_config",
    {
      appId: "cli_a8c1429555f2d00b",
      appSecret: "GIo6yYfRrkY2MmGzPIKrOdjB66NlcDJ1",
      appToken: "IRkPbJ7tta2qQTsOsVrcCOzmnXH",
      tableId: "tblldsRMoNBCneUt",
      syncInterval: 24,
    }
  );
  const [isLogModalOpen, setLogModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [isFullWidth, setIsFullWidth] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [lastSyncTime, setLastSyncTime] = useLocalStorage<string | null>(
    "last_sync_time",
    null
  );

  // --- 数据获取与初始化 ---
  useEffect(() => {
    const fetchTypes = async () => {
      const types = await feishuAPIService.getTypes(feishuConfig);
      setAvailableTypes(types.length > 0 ? types : ["其他"]);
    };
    fetchTypes();
  }, [feishuConfig]);

  // --- 数据处理与计算 ---
  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 0 }),
    [currentDate]
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  console.log(
    "[DEBUG] weekDays:",
    weekDays.map((d) => format(d, "yyyy/MM/dd"))
  );

  const timeLabels = useMemo(
    () => Array.from({ length: 17 }).map((_, i) => `${i + 8}:00`),
    []
  );

  const colorMap = useMemo(() => {
    const uniqueTypes = [...new Set(logEntries.map((e) => e.type))];
    return uniqueTypes.reduce<ColorMap>((acc, type, index) => {
      acc[type] = THEME_COLORS[index % THEME_COLORS.length];
      return acc;
    }, {});
  }, [logEntries]);

  const filteredEntries = useMemo(() => {
    const result = logEntries.filter(
      (entry) =>
        entry.status !== "本地删除" &&
        entry.content.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedType === "all" || entry.type === selectedType)
    );
    console.log("[DEBUG] filteredEntries:", result);
    return result;
  }, [logEntries, searchTerm, selectedType]);

  const allTypesForFilter = useMemo(
    () => ["all", ...availableTypes],
    [availableTypes]
  );

  // --- 事件处理 ---
  const handlePrevWeek = () => setCurrentDate((prev) => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentDate((prev) => addWeeks(prev, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleOpenLogModal = (entry: LogEntry | null) => {
    setTooltip(null);
    setSelectedEntry(entry);
    setLogModalOpen(true);
  };
  const handleCloseLogModal = () => {
    setLogModalOpen(false);
    setSelectedEntry(null);
  };

  const handleSaveLog = (entryToSave: LogEntry) => {
    console.log("[DEBUG] handleSaveLog entryToSave:", entryToSave);
    setLogEntries((prev) => {
      const isNew = entryToSave.id.startsWith("new-");
      const type = entryToSave.type || "其他";
      const status = "未同步" as const;

      if (isNew) {
        const newEntry = {
          ...entryToSave,
          id: crypto.randomUUID(),
          type,
          status,
        };

        // 检查当前数据是否为初始的MOCK数据
        const mockIds = new Set(MOCK_LOG_ENTRIES.map((e) => e.id));
        const isPrevMock =
          prev.length === MOCK_LOG_ENTRIES.length &&
          prev.every((p) => mockIds.has(p.id));

        if (isPrevMock) {
          console.log("[DEBUG] 本地为虚拟数据，直接替换为新数据:", newEntry);
          return [newEntry];
        }

        console.log("[DEBUG] 新建日志:", newEntry);
        return [...prev, newEntry];
      }

      const updated = prev.map((e) =>
        e.id === entryToSave.id ? { ...entryToSave, type, status } : e
      );
      console.log("[DEBUG] 更新日志:", updated);
      return updated;
    });
    handleCloseLogModal();
  };

  const handleDeleteLog = (id: string) => {
    setLogEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "本地删除" } : e))
    );
    handleCloseLogModal();
  };
  const handleSaveSettings = (newConfig: FeishuConfig) => {
    setFeishuConfig(newConfig);
    setSyncMessage("配置已保存！");
    setTimeout(() => setSyncMessage(""), 3000);
    handleCloseSettingsModal();
  };
  const handleCloseSettingsModal = () => setSettingsModalOpen(false);

  const handleSync = useCallback(
    async (isAutoSync = false) => {
      if (
        !feishuConfig.appId ||
        !feishuConfig.appToken ||
        !feishuConfig.tableId
      ) {
        if (!isAutoSync) {
          setSyncMessage("请先完成飞书 API 配置！");
          setSettingsModalOpen(true);
          setTimeout(() => setSyncMessage(""), 5000);
        }
        return;
      }
      setIsSyncing(true);
      setSyncMessage("同步中...");
      console.log("[DEBUG] 开始同步...");

      try {
        // 1. 获取两端数据
        const localEntries = logEntries;
        const remoteEntries = await feishuAPIService.getRecords(feishuConfig);
        const remoteEntriesMap = new Map(
          remoteEntries.map((e: LogEntry) => [e.id, e])
        );
        let newLocalEntries = [...localEntries];
        const localEntriesMap = new Map(
          newLocalEntries.map((e: LogEntry) => [e.id, e])
        );

        // 2. 处理本地删除
        const toDeleteLocally = localEntries.filter(
          (l) => l.status === "本地删除"
        );
        if (toDeleteLocally.length > 0) {
          await feishuAPIService.batchUpdateStatus(
            feishuConfig,
            toDeleteLocally.map((e) => ({ id: e.id, status: "本地删除" }))
          );
          // 彻底删除
          newLocalEntries = newLocalEntries.filter(
            (l) => l.status !== "本地删除"
          );
        }

        // 3. 处理本地的新增和修改
        const toUpload = newLocalEntries.filter((l) => l.status === "未同步");
        for (const localEntry of toUpload) {
          const remoteEntry = remoteEntriesMap.get(localEntry.id);
          if (remoteEntry) {
            // 更新
            await feishuAPIService.updateRecord(feishuConfig, {
              ...localEntry,
              status: "已同步",
            });
            // 更新本地状态
            const index = newLocalEntries.findIndex(
              (e) => e.id === localEntry.id
            );
            if (index !== -1) {
              newLocalEntries[index].status = "已同步";
            }
          } else {
            // 新增，并获取飞书返回的真实record_id
            const newRecordId = await feishuAPIService.createRecord(
              feishuConfig,
              {
                ...localEntry,
                status: "已同步",
              }
            );
            // 更新本地条目的ID和状态
            const index = newLocalEntries.findIndex(
              (e) => e.id === localEntry.id
            );
            if (index !== -1) {
              newLocalEntries[index].id = newRecordId;
              newLocalEntries[index].status = "已同步";
              localEntriesMap.set(newRecordId, newLocalEntries[index]); // 更新map
              localEntriesMap.delete(localEntry.id); // 删除旧的临时id
            }
          }
        }

        // 4. 处理飞书的所有记录（下载新增/修改，并为后续删除做准备）
        const remoteIds = new Set<string>();
        for (const remoteEntry of remoteEntries) {
          remoteIds.add(remoteEntry.id);
          const localEntry = localEntriesMap.get(remoteEntry.id);

          // 如果远程状态不是"本地删除" 且 本地不存在 -> 下载
          if (remoteEntry.status !== "本地删除" && !localEntry) {
            console.log(`[DEBUG] 从飞书下载新记录: ${remoteEntry.id}`);
            newLocalEntries.push({ ...remoteEntry, status: "已同步" });
            localEntriesMap.set(remoteEntry.id, {
              ...remoteEntry,
              status: "已同步",
            });
            // 如果下载的是未同步条目，需更新飞书状态
            if (remoteEntry.status === "未同步") {
              await feishuAPIService.updateRecord(feishuConfig, {
                ...remoteEntry,
                status: "已同步",
              });
            }
          } else if (remoteEntry.status !== "本地删除" && localEntry) {
            // --- 新增：如果本地有，且远程有变动（如日期被手动修改），则用远程覆盖本地 ---
            const fieldsToCheck = [
              "content",
              "date",
              "time",
              "type",
              "status",
              "createdAt",
            ];
            let needUpdate = false;
            for (const field of fieldsToCheck) {
              if ((localEntry as any)[field] !== (remoteEntry as any)[field]) {
                needUpdate = true;
                break;
              }
            }
            if (needUpdate) {
              const idx = newLocalEntries.findIndex(
                (e) => e.id === remoteEntry.id
              );
              if (idx !== -1) {
                newLocalEntries[idx] = { ...remoteEntry, status: "已同步" };
                localEntriesMap.set(remoteEntry.id, {
                  ...remoteEntry,
                  status: "已同步",
                });
              }
            }
          }
        }

        // 5. 处理在飞书上被界面外删除的记录
        newLocalEntries = newLocalEntries.filter((l) => remoteIds.has(l.id));

        setLogEntries(newLocalEntries);
        setSyncMessage("同步成功！");
        setLastSyncTime(format(new Date(), "yyyy-MM-dd HH:mm:ss"));
        // --- 新增：同步后刷新类型选项 ---
        const types = await feishuAPIService.getTypes(feishuConfig);
        setAvailableTypes(types.length > 0 ? types : ["其他"]);
      } catch (error) {
        console.error("同步失败:", error);
        setSyncMessage("同步失败，请检查控制台");
      } finally {
        setIsSyncing(false);
        console.log("[DEBUG] 同步流程结束");
        setTimeout(() => setSyncMessage(""), 5000);
      }
    },
    [feishuConfig, logEntries, setLogEntries, setLastSyncTime]
  );

  // --- 自动同步 Effect ---
  useEffect(() => {
    const handlePageLoadSync = () => {
      const hasLoadedThisSession = sessionStorage.getItem(
        "hasLoadedThisSession"
      );
      let refreshCount = parseInt(
        sessionStorage.getItem("refreshCount") || "0",
        10
      );

      if (!hasLoadedThisSession) {
        console.log("首次加载，执行自动同步...");
        handleSync(true);
        sessionStorage.setItem("hasLoadedThisSession", "true");
        sessionStorage.setItem("refreshCount", "0");
      } else {
        refreshCount++;
        if (refreshCount >= 3) {
          console.log("连续刷新3次，执行自动同步...");
          handleSync(true);
          refreshCount = 0; // Reset
        }
        sessionStorage.setItem("refreshCount", refreshCount.toString());
      }
    };

    handlePageLoadSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on initial mount

  // --- Tooltip Handlers ---
  const showTooltip = (e: React.MouseEvent, entry: LogEntry) => {
    setTooltip({ entry, x: e.clientX, y: e.clientY });
  };

  const hideTooltip = () => {
    setTooltip(null);
  };

  return (
    <div className="bg-gray-50 font-sans p-4 lg:p-6 min-h-screen">
      <Tooltip tooltip={tooltip} />
      <div
        className={isFullWidth ? "w-full mx-auto" : "max-w-7xl mx-auto"}
        style={isFullWidth ? { maxWidth: "100%" } : { maxWidth: "1200px" }}
      >
        <header className="mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-800">工作记录</h1>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="搜索日志内容..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-1.5 w-180 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="relative">
                <button
                  type="button"
                  className="px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 bg-white flex items-center min-w-[100px]"
                  onClick={() => setDropdownOpen((v) => !v)}
                >
                  {selectedType === "all" ? "所有类型" : selectedType}
                  <svg
                    className={`ml-2 w-4 h-4 transition-transform ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute left-0 mt-1 min-w-full max-w-[260px] bg-white border border-gray-200 rounded-md shadow-lg z-20 overflow-x-auto">
                    {allTypesForFilter.map((type) => (
                      <button
                        key={type}
                        className={`block text-nowrap w-full text-left px-4 py-2 text-sm hover:bg-blue-50 ${
                          selectedType === type
                            ? "bg-blue-100 text-blue-700"
                            : "text-gray-700"
                        }`}
                        style={{ whiteSpace: "nowrap" }}
                        onClick={() => {
                          setSelectedType(type);
                          setDropdownOpen(false);
                        }}
                      >
                        {type === "all" ? "所有类型" : type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-gray-300 mx-2"> | </span>
              <div className="flex items-center">
                <button
                  onClick={handlePrevWeek}
                  className="px-2 py-1.5 text-gray-600 bg-white border border-r-0 border-gray-300 rounded-l-md hover:bg-gray-100"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={handleToday}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-100"
                >
                  今天
                </button>
                <button
                  onClick={handleNextWeek}
                  className="px-2 py-1.5 text-gray-600 bg-white border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-100"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <div className="w-40">
                <CustomDatePicker
                  value={currentDate}
                  onChange={setCurrentDate}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {syncMessage && (
                <span className="text-xs text-gray-500">{syncMessage}</span>
              )}
              <button
                onClick={() => handleSync(false)}
                disabled={isSyncing}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              >
                {isSyncing ? "同步中..." : "同步数据"}
              </button>
              <button
                className="p-2 text-gray-600 hover:bg-gray-200 rounded-full"
                onClick={() => setIsFullWidth((v) => !v)}
              >
                {isFullWidth ? (
                  <Minimize size={20} />
                ) : (
                  <Fullscreen size={20} />
                )}
              </button>
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="p-2 text-gray-600 hover:bg-gray-200 rounded-full"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
        </header>

        <main className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div
            className="grid"
            style={{ gridTemplateColumns: "4rem repeat(7, 1fr)" }}
          >
            <div className="p-2 border-b border-r">
              <button
                onClick={() => handleOpenLogModal(null)}
                className="w-full h-full flex items-center justify-center text-yellow-600 hover:text-yellow-800"
                title="创建新日志"
              >
                <PlusCircle size={24} />
              </button>
            </div>
            {weekDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={`p-2 text-center border-b border-r  ${
                    isToday
                      ? "bg-blue-50 border-l-2 border-r-2 border-blue-200 -ml-px text-blue-800"
                      : "text-gray-400"
                  }`}
                >
                  <p className="text-xs">
                    {
                      ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][
                        getDay(day)
                      ]
                    }
                  </p>
                  <p className="text-lg">{format(day, "d")}</p>
                </div>
              );
            })}

            {timeLabels.map((time, hourIndex) => {
              const hour = hourIndex + 8;
              return (
                <div key={time} style={{ display: "contents" }}>
                  {/* Time Label */}
                  <div className="col-start-1 border-r border-b border-gray-200 min-h-[3rem] flex items-start justify-center pt-1">
                    <span className="text-xs text-gray-500 -mt-1">{time}</span>
                  </div>

                  {/* Day Cells */}
                  {weekDays.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    const entriesForCell = filteredEntries
                      .filter((entry) => {
                        let dateStr = entry.date;
                        let timeStr = entry.time;
                        if (typeof dateStr !== "string" || !dateStr.trim())
                          return false;
                        if (typeof timeStr !== "string" || !timeStr.trim())
                          return false;
                        return (
                          dateStr === format(day, "yyyy/MM/dd") &&
                          getHours(parse(timeStr, "HH:mm", new Date())) === hour
                        );
                      })
                      .sort((a, b) => a.time.localeCompare(b.time));

                    return (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className={`col-auto border-r border-b border-gray-200 p-1 min-h-[3rem] overflow-y-auto ${
                          isToday
                            ? "bg-blue-50 border-l-2 border-r-2 border-blue-200 -ml-px"
                            : ""
                        }`}
                      >
                        {entriesForCell.map((entry) => (
                          <LogEntryItem
                            key={entry.id}
                            entry={entry}
                            color={colorMap[entry.type] || THEME_COLORS[0]}
                            onClick={() => handleOpenLogModal(entry)}
                            onMouseEnter={showTooltip}
                            onMouseLeave={hideTooltip}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </main>
        <footer className="pt-2 text-center text-xs text-gray-400">
          {lastSyncTime ? `最近一次同步: ${lastSyncTime}` : "暂无同步记录"}
        </footer>
      </div>

      <LogModal
        isOpen={isLogModalOpen}
        onClose={handleCloseLogModal}
        entry={
          selectedEntry || {
            id: `new-${Date.now()}`,
            content: "",
            date: format(currentDate, "yyyy/MM/dd"),
            time: format(new Date(), "HH:mm"),
            type: availableTypes[0] || "其他",
            status: "未同步",
            createdAt: new Date().toISOString(),
          }
        }
        onSave={handleSaveLog}
        onDelete={handleDeleteLog}
        availableTypes={availableTypes}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={handleCloseSettingsModal}
        config={feishuConfig}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default App;
