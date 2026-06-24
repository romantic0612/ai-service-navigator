import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  base: process.env.VITE_WEB_BASE_PATH || '/service/',
  server: {
    port: 5173,
  },
});
