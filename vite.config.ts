import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  //新增服务器代理配置
  server: {
    proxy: {
      // 关键：将所有以 /feishu 开头的请求，代理到飞书的开放平台API服务器
      '/feishu': {
        target: 'https://open.feishu.cn/open-apis', // 飞书API的基地址
        changeOrigin: true, // 必须设置为 true
        rewrite: (path) => path.replace(/^\/feishu/, ''), // 重写路径，去掉开头的 /feishu
      },
    },
  },
});
