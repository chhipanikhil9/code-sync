// client/vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import monacoEditorPlugin from 'vite-plugin-monaco-editor'; // <-- 1. IMPORT

export default defineConfig({
  plugins: [
    react(),
    monacoEditorPlugin.default({ languageWorkers: ['editorWorkerService', 'css', 'html', 'json', 'typescript'] }) // <-- 2. ADD PLUGIN
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})