import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	test: {
		// exclude を拡張する代わりに include で対象を明示する。.direnv には flake input として
		// 本リポジトリのコピーが取り込まれるが、そもそも tests/ 配下しか対象にしないため無関係。
		include: ['tests/**/*.test.ts'],
	},
});
