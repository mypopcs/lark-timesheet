import React, { useState, useEffect, useMemo } from "react";
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
import { feishuAPIService } from "./services/feishuAPI";
import { LogEntryItem } from "./components/LogEntryItem";
import { Tooltip } from "./components/Tooltip";
import { LogModal } from "./components/LogModal";
import { SettingsModal } from "./components/SettingsModal";
import { CustomDatePicker } from "./components/CustomDatePicker";

const App: React.FC = () => {
  // --- 状态管理 ---
  const [currentDate, setCurrentDate] = useState(new Date());
  // 本地存储feishuConfig
  function getFeishuConfigFromStorage(): FeishuConfig {
    const raw = window.localStorage.getItem("feishu_config");
    if (raw) return JSON.parse(raw);
    return {
      appId: "cli_a8c1429555f2d00b",
      appSecret: "GIo6yYfRrkY2MmGzPIKrOdjB66NlcDJ1",
      appToken: "IRkPbJ7tta2qQTsOsVrcCOzmnXH",
      tableId: "tblldsRMoNBCneUt",
      syncInterval: 24,
    };
  }
  const [feishuConfig, setFeishuConfigState] = useState<FeishuConfig>(
    getFeishuConfigFromStorage()
  );
  const setFeishuConfig = (cfg: FeishuConfig) => {
    setFeishuConfigState(cfg);
    window.localStorage.setItem("feishu_config", JSON.stringify(cfg));
  };
  const [isLogModalOpen, setLogModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [isFullWidth, setIsFullWidth] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  // --- 数据获取与初始化 ---
  useEffect(() => {
    const fetchData = async () => {
      const records = await feishuAPIService.getRecords(feishuConfig);
      setLogEntries(records);
      const types = await feishuAPIService.getTypes(feishuConfig);
      setAvailableTypes(types.length > 0 ? types : ["其他"]);
    };
    fetchData();
  }, [feishuConfig, currentDate]);

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

  const handleOpenLogModal = (entry: LogEntry | null) => {
    setTooltip(null);
    setSelectedEntry(entry);
    setLogModalOpen(true);
  };
  const handleCloseLogModal = () => {
    setLogModalOpen(false);
    setSelectedEntry(null);
  };

  const handleSaveLog = async (entryToSave: LogEntry) => {
    if (!entryToSave.id || entryToSave.id.startsWith("new-")) {
      await feishuAPIService.createRecord(feishuConfig, entryToSave);
    } else {
      await feishuAPIService.updateRecord(feishuConfig, entryToSave);
    }
    // 操作后刷新
    const records = await feishuAPIService.getRecords(feishuConfig);
    setLogEntries(records);
    handleCloseLogModal();
  };

  const handleDeleteLog = async (id: string) => {
    // 直接调用updateRecord将状态设为本地删除
    const entry = logEntries.find((e) => e.id === id);
    if (entry) {
      await feishuAPIService.updateRecord(feishuConfig, {
        ...entry,
        status: "本地删除",
      });
      const records = await feishuAPIService.getRecords(feishuConfig);
      setLogEntries(records);
    }
    handleCloseLogModal();
  };
  const handleSaveSettings = (newConfig: FeishuConfig) => {
    setFeishuConfig(newConfig);
    setSyncMessage("配置已保存！");
    setTimeout(() => setSyncMessage(""), 3000);
    handleCloseSettingsModal();
  };
  const handleCloseSettingsModal = () => setSettingsModalOpen(false);

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
              <div className="relative">
                <button
                  type="button"
                  className="text-lg font-bold text-gray-800 focus:ring-blue-500 flex items-center"
                  style={{ fontSize: "1.5rem", height: "3.5rem" }}
                  onClick={() => setDropdownOpen((v) => !v)}
                >
                  {selectedType === "all" ? "所有类型" : selectedType}
                  <svg
                    className={`ml-2 w-6 h-6 transition-transform ${
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
                  <div className="absolute left-0 mt-1 min-w-full max-w-[320px] bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-x-auto">
                    {allTypesForFilter.map((type) => (
                      <button
                        key={type}
                        className={`block text-nowrap w-full text-left px-6 py-3 text-xs hover:bg-blue-50 ${
                          selectedType === type
                            ? "bg-blue-100 text-blue-700 font-bold"
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
              <span className="text-gray-300 mx-2"> | </span>
              <div className="flex items-center">
                <button
                  onClick={handlePrevWeek}
                  className="px-2 py-1.5 text-gray-600 bg-white border border-r-0 border-gray-300 rounded-l-md hover:bg-gray-100"
                >
                  <ChevronLeft size={20} />
                </button>
                <CustomDatePicker
                  value={currentDate}
                  onChange={setCurrentDate}
                />
                <button
                  onClick={handleNextWeek}
                  className="px-2 py-1.5 text-gray-600 bg-white border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-100"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <div className="w-40"></div>
            </div>
            <div className="flex items-center gap-2">
              {syncMessage && (
                <span className="text-xs text-gray-500">{syncMessage}</span>
              )}
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
