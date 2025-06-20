import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  subMonths,
  addMonths,
  endOfWeek,
  isSameWeek,
} from "date-fns";
import { useOnClickOutside } from "../hooks/useOnClickOutside";

export const CustomDatePicker: React.FC<{
  value: Date;
  onChange: (date: Date) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value);
  const [hoveredWeek, setHoveredWeek] = useState<Date | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const weekStartsOn = 0; // Sunday

  useOnClickOutside(pickerRef, () => setIsOpen(false));

  const calendarRows = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn });
    const endDate = endOfWeek(monthEnd, { weekStartsOn });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const rows = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  }, [viewDate]);

  const handleSelectWeek = (weekStartDate: Date) => {
    onChange(weekStartDate);
    setIsOpen(false);
  };

  const today = new Date();

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => {
          setViewDate(value);
          setIsOpen(!isOpen);
        }}
        className="px-3 py-1.5 w-full text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 flex items-center justify-between"
      >
        <span>{`${format(
          startOfWeek(value, { weekStartsOn }),
          "yyyy/M/d"
        )} - ${format(endOfWeek(value, { weekStartsOn }), "d")}`}</span>
        <svg
          className={`w-4 h-4 ml-2 transition-transform duration-200 ${
            isOpen ? "transform rotate-180" : ""
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
          ></path>
        </svg>
      </button>
      {isOpen && (
        <div className="absolute top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setViewDate(subMonths(viewDate, 1))}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold text-gray-800">
              {format(viewDate, "yyyy年 M月")}
            </span>
            <button
              onClick={() => setViewDate(addMonths(viewDate, 1))}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
            {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="space-y-1">
            {calendarRows.map((week, i) => {
              const isWeekSelected = isSameWeek(week[0], value, {
                weekStartsOn,
              });
              const isWeekHovered =
                hoveredWeek &&
                isSameWeek(week[0], hoveredWeek, { weekStartsOn });
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredWeek(week[0])}
                  onMouseLeave={() => setHoveredWeek(null)}
                  onClick={() => handleSelectWeek(week[0])}
                  className={`flex justify-around rounded-md cursor-pointer
                                        ${isWeekSelected ? "bg-blue-100" : ""}
                                        ${
                                          !isWeekSelected && isWeekHovered
                                            ? "bg-gray-100"
                                            : ""
                                        }
                                    `}
                >
                  {week.map((day) => {
                    const isToday = isSameDay(day, today);
                    const isCurrentMonth = isSameMonth(day, viewDate);
                    return (
                      <div
                        key={day.toString()}
                        className={`
                                                    w-9 h-9 flex items-center justify-center rounded-full text-sm 
                                                    ${
                                                      !isCurrentMonth
                                                        ? "text-gray-300"
                                                        : "text-gray-700"
                                                    }
                                                    ${
                                                      isToday
                                                        ? "border border-blue-500"
                                                        : ""
                                                    }
                                                    ${
                                                      isSameDay(day, value)
                                                        ? "bg-blue-600 text-white"
                                                        : ""
                                                    }
                                                `}
                      >
                        {format(day, "d")}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="border-t mt-4 pt-2">
            <button
              onClick={() => handleSelectWeek(today)}
              className="w-full text-center text-sm text-blue-600 hover:font-semibold"
            >
              今天
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
