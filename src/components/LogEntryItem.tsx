import React from "react";
import type { LogEntry, ColorTheme } from "../types";

export const LogEntryItem: React.FC<{
  entry: LogEntry;
  color: ColorTheme;
  onClick: () => void;
  onMouseEnter: (e: React.MouseEvent, entry: LogEntry) => void;
  onMouseLeave: () => void;
}> = ({ entry, color, onClick, onMouseEnter, onMouseLeave }) => (
  <div
    className={`w-full max-w-[240px] p-1 rounded-md shadow-sm cursor-pointer border-l-4 transition-all duration-200 ease-in-out hover:shadow-md flex justify-between items-center ${color.bg} ${color.border}`}
    onClick={onClick}
    onMouseEnter={(e) => onMouseEnter(e, entry)}
    onMouseLeave={onMouseLeave}
  >
    <div className="flex-1 text-xs flex items-center overflow-hidden">
      <span className="text-gray-500 font-mono mr-1.5">{entry.time}</span>
      <span className={`font-medium truncate ${color.text}`}>
        {entry.content}
      </span>
    </div>
    <span
      className={`ml-2 px-1.5 py-0.5 rounded text-white text-[10px] whitespace-nowrap ${color.tagBg}`}
    >
      {entry.type}
    </span>
  </div>
);
