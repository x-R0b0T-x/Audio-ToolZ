import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { copyFileSync, cpSync, mkdirSync } from 'node:fs';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: './',
  publicDir: command === 'build' ? false : 'public',
  plugins: [react(), tailwindcss(), {
    name: 'audio-toolz-runtime-icons',
    apply: 'build',
    writeBundle(options) {
      const output = options.dir ?? 'dist';
      mkdirSync(output, { recursive: true });
      for (const icon of ['icon.ico', 'icon.png']) {
        copyFileSync(path.resolve(__dirname, 'public', icon), path.join(output, icon));
      }
      cpSync(
        path.resolve(__dirname, 'public', 'third_party', 'bpm'),
        path.join(output, 'third_party', 'bpm'),
        { recursive: true },
      );
    },
  }],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));
