import React from "react";
import type { TooltipState } from "../types";

export const Tooltip: React.FC<{ tooltip: TooltipState | null }> = ({
  tooltip,
}) => {
  if (!tooltip) return null;

  return (
    <div
      className="fixed w-max max-w-xs p-2 bg-gray-800 text-white text-xs rounded-md shadow-lg z-50 pointer-events-none"
      style={{
        left: tooltip.x + 15,
        top: tooltip.y + 15,
      }}
    >
      <p>
        <strong>内容:</strong> {tooltip.entry.content}
      </p>
      <p>
        <strong>时间:</strong> {tooltip.entry.date} {tooltip.entry.time}
      </p>
      <p>
        <strong>类型:</strong> {tooltip.entry.type}
      </p>
    </div>
  );
};
