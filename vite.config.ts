import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { configDefaults } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	test: {
		// .direnv には flake input として本リポジトリのコピーが取り込まれるため、
		// デフォルト除外だけでは tests/sample.test.ts を二重に拾ってしまう。
		exclude: [...configDefaults.exclude, '**/.direnv/**'],
	},
});
