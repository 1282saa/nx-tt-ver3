import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    open: true,
    // HTML5 History API를 위한 설정
    historyApiFallback: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  // 프리뷰 서버에서도 라우팅 지원
  preview: {
    port: 3000,
    historyApiFallback: true,
  },
});
