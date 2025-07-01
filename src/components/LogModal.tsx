import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { format } from "date-fns";
import type { LogEntry } from "../types";
import { useOnClickOutside } from "../hooks/useOnClickOutside";

export const LogModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  entry: LogEntry | null;
  onSave: (entry: LogEntry) => void;
  onDelete: (id: string) => void;
  availableTypes: string[];
}> = ({ isOpen, onClose, entry, onSave, onDelete, availableTypes }) => {
  const [formData, setFormData] = useState<Omit<LogEntry, "id" | "createdAt">>({
    content: "",
    date: "",
    time: "",
    type: "",
    status: "未同步",
  });
  const [initialData, setInitialData] = useState<
    Omit<LogEntry, "id" | "createdAt">
  >({ content: "", date: "", time: "", type: "", status: "未同步" });
  const modalRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useOnClickOutside(modalRef, onClose);

  useEffect(() => {
    if (isOpen) {
      const data = entry
        ? { ...entry }
        : {
            content: "",
            date: format(new Date(), "yyyy/MM/dd"),
            time: format(new Date(), "HH:mm"),
            type: availableTypes[0] || "",
            status: "未同步" as const,
          };
      let timeStr = data.time || "";
      if (typeof timeStr === "string" && timeStr) {
        const match = timeStr.match(/^(\d{1,2}):(\d{1,2})/);
        if (match) {
          const h = match[1].padStart(2, "0");
          const m = match[2].padStart(2, "0");
          timeStr = `${h}:${m}`;
        }
      }
      setFormData({ ...data, time: timeStr });
      setInitialData({ ...data, time: timeStr });
    }
  }, [entry, isOpen, availableTypes]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!isDirty) return;
    if (!formData.content || !formData.type) {
      alert("内容和类型不能为空！");
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        id: entry?.id || `new-${Date.now()}`,
        createdAt: entry?.createdAt || new Date().toISOString(),
      });
      setMessage("保存成功");
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (entry && !isCreating) {
      setIsDeleting(true);
      try {
        await onDelete(entry.id);
        setMessage("删除成功");
        setTimeout(() => setMessage(null), 3000);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const isCreating = !entry?.id || entry.id.startsWith("new-");
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
        <h2 className="text-xl font-bold mb-4">
          {isCreating ? "新建日志" : "编辑日志"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              内容
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows={4}
              className="mt-1 text-sm block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 resize-y h-[68px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              类型
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="mt-1 text-sm block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                日期
              </label>
              <div className="mt-1 text-sm block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 text-gray-500">
                {typeof formData.date === "string"
                  ? formData.date.replace(/\//g, "-")
                  : formData.date}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                时间
              </label>
              <div className="mt-1 text-sm block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 text-gray-500">
                {formData.time}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          {!isCreating && (
            <button
              onClick={handleDelete}
              type="button"
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-sm text-white rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              {isDeleting ? "删除中..." : "删除"}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="px-4 py-2 bg-blue-600 text-sm text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isSaving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
      {message && (
        <div className="fixed left-1/2 top-10 transform -translate-x-1/2 bg-green-500 text-white px-6 py-2 rounded shadow-lg z-50 text-base">
          {message}
        </div>
      )}
    </div>
  );
};
