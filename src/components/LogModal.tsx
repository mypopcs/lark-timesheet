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
  });
  const [initialData, setInitialData] = useState<
    Omit<LogEntry, "id" | "createdAt">
  >({ content: "", date: "", time: "", type: "" });
  const modalRef = useRef<HTMLDivElement>(null);

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
          };
      setFormData(data);
      setInitialData(data);
    }
  }, [entry, isOpen, availableTypes]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!isDirty) return;
    if (!formData.content || !formData.type) {
      alert("内容和类型不能为空！");
      return;
    }
    onSave({
      ...formData,
      id: entry?.id || `new-${Date.now()}`,
      createdAt: entry?.createdAt || new Date().toISOString(),
    });
  };

  const handleDelete = () => {
    if (entry && !isCreating) {
      onDelete(entry.id);
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
            <input
              type="text"
              name="content"
              value={formData.content}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
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
              <input
                type="date"
                name="date"
                value={
                  typeof formData.date === "string"
                    ? formData.date.replace(/\//g, "-")
                    : formData.date
                }
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 text-gray-500"
                disabled={!isCreating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                时间
              </label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          {!isCreating && (
            <button
              onClick={handleDelete}
              type="button"
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              删除
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
