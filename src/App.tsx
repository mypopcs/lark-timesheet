import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
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
import { getAccessToken } from "./services/feishuAPI";
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
    MOCK_LOG_ENTRIES
  );
  const [feishuConfig, setFeishuConfig] = useLocalStorage<FeishuConfig>(
    "feishu_config",
    { appId: "", appSecret: "", appToken: "", tableId: "", syncInterval: 24 }
  );
  const [isLogModalOpen, setLogModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const syncIntervalRef = useRef<number | null>(null);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [isFullWidth, setIsFullWidth] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
        entry.content.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedType === "all" || entry.type === selectedType)
    );
    console.log("[DEBUG] filteredEntries:", result);
    return result;
  }, [logEntries, searchTerm, selectedType]);

  const allTypesForFilter = useMemo(
    () => ["all", ...new Set(logEntries.map((e) => e.type))],
    [logEntries]
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
      if (isNew) {
        const newEntry = { ...entryToSave, id: crypto.randomUUID(), type };
        console.log("[DEBUG] 新建日志:", newEntry);
        return [...prev, newEntry];
      }
      const updated = prev.map((e) =>
        e.id === entryToSave.id ? { ...entryToSave, type } : e
      );
      console.log("[DEBUG] 更新日志:", updated);
      return updated;
    });
    handleCloseLogModal();
  };

  const handleDeleteLog = (id: string) => {
    setLogEntries((prev) => prev.filter((e) => e.id !== id));
    handleCloseLogModal();
  };
  const handleSaveSettings = (newConfig: FeishuConfig) => {
    setFeishuConfig(newConfig);
    alert("配置已保存！");
    handleCloseSettingsModal();
  };
  const handleCloseSettingsModal = () => setSettingsModalOpen(false);

  const handleSync = useCallback(async () => {
    if (
      !feishuConfig.appId ||
      !feishuConfig.appToken ||
      !feishuConfig.tableId
    ) {
      alert("请先在设置中完成飞书 API 配置！");
      setSettingsModalOpen(true);
      return;
    }
    setIsSyncing(true);
    console.log("[DEBUG] 开始同步，当前本地数据:", logEntries);
    try {
      const remoteEntries = await feishuAPIService.getRecords(feishuConfig);
      console.log("[DEBUG] 获取到远程数据:", remoteEntries);
      const cleanRemoteEntries = remoteEntries.filter(
        (e) => typeof e.time === "string"
      );
      const cleanLocalEntries = logEntries.filter(
        (e) => typeof e.time === "string"
      );

      // === 删除同步逻辑 ===
      // 1. 本地有但飞书没有的（飞书被删了，本地也删）
      const remoteIdsForDelete = new Set(cleanRemoteEntries.map((e) => e.id));
      const onlyLocal = cleanLocalEntries.filter(
        (e) => !remoteIdsForDelete.has(e.id)
      );
      if (onlyLocal.length > 0) {
        setLogEntries((prev) =>
          prev.filter((e) => remoteIdsForDelete.has(e.id))
        );
      }

      // 2. 飞书有但本地没有的（本地被删了，飞书也删）
      const localIdsForDelete = new Set(cleanLocalEntries.map((e) => e.id));
      const onlyRemote = cleanRemoteEntries.filter(
        (e) => !localIdsForDelete.has(e.id)
      );
      for (const entry of onlyRemote) {
        try {
          // 直接调用飞书API删除接口
          const token = await getAccessToken(feishuConfig);
          await fetch(
            `/feishu/bitable/v1/apps/${feishuConfig.appToken}/tables/${feishuConfig.tableId}/records/${entry.id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json; charset=utf-8",
                Accept: "application/json",
              },
            }
          );
        } catch (err) {
          console.error("删除飞书记录失败:", entry.id, err);
        }
      }

      // 判断本地是否为初始mock数据
      const isMock =
        cleanLocalEntries.length === MOCK_LOG_ENTRIES.length &&
        cleanLocalEntries.every((e, i) => e.id === MOCK_LOG_ENTRIES[i].id);

      if (isMock || cleanLocalEntries.length === 0) {
        // 第一次同步，只用飞书数据覆盖本地，不写入飞书
        setLogEntries(cleanRemoteEntries);
        console.log(
          "[DEBUG] 第一次同步，用飞书数据覆盖本地:",
          cleanRemoteEntries
        );
        alert("已用飞书数据覆盖本地（未写入飞书）！");
        setIsSyncing(false);
        return;
      }

      // 后续同步：合并并增量写入
      // 1. 找出本地有但飞书没有的（新增）
      const remoteIds = new Set(cleanRemoteEntries.map((e) => e.id));
      const toAdd = cleanLocalEntries.filter((e) => !remoteIds.has(e.id));
      // 2. 找出本地和飞书都有但内容不同的（更新）
      const toUpdate = cleanLocalEntries.filter((e) => {
        const remote = cleanRemoteEntries.find((r) => r.id === e.id);
        return remote && JSON.stringify(remote) !== JSON.stringify(e);
      });

      console.log("[DEBUG] 需要新增到飞书的数据:", toAdd);
      console.log("[DEBUG] 需要更新到飞书的数据:", toUpdate);

      for (const entry of toAdd) {
        const newId = await feishuAPIService.createRecord(feishuConfig, entry);
        // 用飞书返回的record_id替换本地id
        entry.id = newId;
      }
      for (const entry of toUpdate) {
        await feishuAPIService.updateRecord(feishuConfig, entry);
      }

      // 再拉取一次飞书数据，刷新本地，合并本地未同步的（如有）
      const latestRemote = await feishuAPIService.getRecords(feishuConfig);
      // 合并本地和飞书数据，去重（以id为准）
      const merged = [...latestRemote];
      const remoteIdsSet = new Set(latestRemote.map((e) => e.id));
      for (const local of logEntries) {
        if (!remoteIdsSet.has(local.id)) {
          merged.push(local);
        }
      }
      setLogEntries(merged);

      alert("双向同步成功！");
    } catch (error) {
      console.error("同步失败:", error);
      alert("同步过程中发生错误，请检查控制台。");
    } finally {
      setIsSyncing(false);
      console.log("[DEBUG] 同步流程结束");
    }
  }, [feishuConfig, logEntries, setLogEntries]);

  // --- 自动同步 Effect ---
  useEffect(() => {
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    if (feishuConfig.syncInterval > 0) {
      syncIntervalRef.current = setInterval(() => {
        console.log(`执行自动同步...`);
        handleSync();
      }, feishuConfig.syncInterval * 3600000);
    }
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [feishuConfig.syncInterval, handleSync]);

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
              <h1 className="text-xl font-bold text-gray-800">
                小时工作记录表
              </h1>
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
                  <div className="absolute left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-20">
                    {allTypesForFilter.map((type) => (
                      <button
                        key={type}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 ${
                          selectedType === type
                            ? "bg-blue-100 text-blue-700"
                            : "text-gray-700"
                        }`}
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
              <button
                onClick={handleSync}
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

            <div className="col-start-1 border-r ">
              {timeLabels.map((time) => (
                <div
                  key={time}
                  className="h-20 flex items-start justify-center pt-1"
                >
                  <span className="text-xs text-gray-500 -mt-2">{time}</span>
                </div>
              ))}
            </div>
            {weekDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={`col-auto border-r ${
                    isToday
                      ? "bg-blue-50 border-l-2 border-r-2 border-blue-200 -ml-px"
                      : ""
                  }`}
                >
                  {timeLabels.map((_, hourIndex) => {
                    const hour = hourIndex + 8;
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
                        className="h-20 border-b border-gray-200 p-1 overflow-y-auto"
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
