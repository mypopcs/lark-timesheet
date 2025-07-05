<template>
  <transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50"
    >
      <transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm relative transform"
        >
          <h3 class="text-lg font-bold text-gray-900">{{ title }}</h3>
          <div class="mt-2 text-sm text-gray-600">
            <pre class="whitespace-pre-wrap font-sans">{{ message }}</pre>
          </div>
          <div class="mt-6 flex gap-3 w-full">
            <button
              @click="onCancel"
              class="px-4 py-2 bg-gray-200 text-sm text-gray-800 rounded-md hover:bg-gray-300 transition-colors flex-grow"
            >
              取消
            </button>
            <button
              @click="onConfirm"
              class="px-4 py-2 bg-red-600 text-sm text-white rounded-md hover:bg-red-700 transition-colors flex-grow"
            >
              确定删除
            </button>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup lang="ts">
// 这个组件非常纯粹，只接收 props 和触发 emits
defineProps({
  isOpen: { type: Boolean, required: true },
  title: { type: String, default: "请确认" },
  message: { type: String, default: "您确定要执行此操作吗？" },
});

const emit = defineEmits(["confirm", "cancel"]);

const onConfirm = () => emit("confirm");
const onCancel = () => emit("cancel");
</script>
