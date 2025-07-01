import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { FeishuConfig } from "../types";
import { useOnClickOutside } from "../hooks/useOnClickOutside";

export const SettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  config: FeishuConfig;
  onSave: (config: FeishuConfig) => void;
}> = ({ isOpen, onClose, config, onSave }) => {
  const [formData, setFormData] = useState(config);
  const [initialData, setInitialData] = useState(config);
  const modalRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(modalRef, onClose);

  useEffect(() => {
    if (isOpen) {
      setFormData(config);
      setInitialData(config);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "syncInterval" ? Number(value) : value,
    }));
  };

  const handleSave = () => {
    if (!isDirty) return;
    onSave(formData);
  };

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);
  const inputStyle =
    "mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500";

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
        <h2 className="text-xl font-bold mb-2">API 与同步设置</h2>
        <p className="text-sm text-gray-500 mb-6">
          请在这里配置飞书多维表格的 API 信息。
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              App ID
            </label>
            <input
              name="appId"
              value={formData.appId}
              onChange={handleChange}
              placeholder="请输入 App ID"
              className={`text-sm ${inputStyle}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              App Secret
            </label>
            <input
              type="password"
              name="appSecret"
              value={formData.appSecret}
              onChange={handleChange}
              placeholder="请输入 App Secret"
              className={`text-sm ${inputStyle}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              App Token
            </label>
            <input
              name="appToken"
              value={formData.appToken}
              onChange={handleChange}
              placeholder="即 Base Token"
              className={`text-sm ${inputStyle}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Table ID
            </label>
            <input
              name="tableId"
              value={formData.tableId}
              onChange={handleChange}
              placeholder="请输入 Table ID"
              className={`text-sm ${inputStyle}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              同步周期 (小时)
            </label>
            <input
              type="number"
              name="syncInterval"
              min="1"
              value={formData.syncInterval}
              onChange={handleChange}
              className={`text-sm ${inputStyle}`}
            />
          </div>
        </div>
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="px-4 py-2 bg-blue-600 text-sm text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
};
