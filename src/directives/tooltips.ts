import type { Directive } from "vue";
import { useUiStore } from "../stores/uiStore";

const listeners = new WeakMap();

export const tooltipDirective: Directive = {
  mounted(el, binding) {
    const uiStore = useUiStore();
    const show = (e: MouseEvent) => uiStore.showTooltip(binding.value, e);
    const hide = () => uiStore.hideTooltip();
    const move = (e: MouseEvent) => uiStore.moveTooltip(e);

    el.addEventListener("mouseenter", show);
    el.addEventListener("mouseleave", hide);
    el.addEventListener("mousemove", move);
    listeners.set(el, { show, hide, move });
  },
  updated(binding) {
    const uiStore = useUiStore();
    if (uiStore.tooltip.visible) {
      uiStore.tooltip.content = binding.value;
    }
  },
  beforeUnmount(el) {
    const { show, hide, move } = listeners.get(el) || {};
    if (show) el.removeEventListener("mouseenter", show);
    if (hide) el.removeEventListener("mouseleave", hide);
    if (move) el.removeEventListener("mousemove", move);
    listeners.delete(el);
  },
};
