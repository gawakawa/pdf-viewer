import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
	test: {
		// exclude を拡張する代わりに include で対象を明示する。Vite のプロジェクトルートは
		// この frontend/ ディレクトリなので、リポジトリ直下の .direnv 等は元々走査対象外。
		include: ['tests/**/*.test.ts'],
	},
});
