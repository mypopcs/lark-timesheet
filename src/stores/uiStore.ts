import { defineStore } from "pinia";
import { reactive } from "vue";

interface TooltipState {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}
interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void; // 当用户点击“确定”时要执行的回调函数
}

export const useUiStore = defineStore("ui", () => {
  const tooltip = reactive<TooltipState>({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });

  function showTooltip(content: string, event: MouseEvent) {
    tooltip.content = content;
    tooltip.visible = true;
    tooltip.x = event.clientX + 15;
    tooltip.y = event.clientY + 15;
  }

  function hideTooltip() {
    tooltip.visible = false;
  }

  function moveTooltip(event: MouseEvent) {
    if (tooltip.visible) {
      tooltip.x = event.clientX + 15;
      tooltip.y = event.clientY + 15;
    }
  }
  const confirmState = reactive<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}, // 默认为一个空函数
  });
  /**
   * @description 请求打开一个确认弹窗
   * @param options 包含标题、信息和确认回调的对象
   * @returns 一个 Promise，在用户做出选择后 resolve
   */
  function showConfirm(options: { title: string; message: string; onConfirm: () => void; }) {
    confirmState.title = options.title;
    confirmState.message = options.message;
    confirmState.onConfirm = options.onConfirm; // 存储回调
    confirmState.isOpen = true;
  }

  // 当用户在弹窗中点击“确定”时调用
  function handleConfirm() {
    confirmState.onConfirm(); // 执行存储的回调
    confirmState.isOpen = false; // 关闭弹窗
  }

  // 当用户在弹窗中点击“取消”时调用
  function handleCancel() {
    confirmState.isOpen = false; // 只关闭弹窗
  }

  return { 
    tooltip, 
    showTooltip, 
    hideTooltip, 
    moveTooltip,
    // 将确认弹窗的状态和方法暴露出去
    confirmState,
    showConfirm,
    handleConfirm,
    handleCancel,
  };
});
