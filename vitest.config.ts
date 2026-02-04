import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.test.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['packages/*/src/**/*.{ts,tsx}'],
            exclude: ['**/index.ts', '**/*.d.ts', '**/types.ts']
        }
    },
    resolve: {
        alias: {
            '@ethervault/core': path.resolve(__dirname, 'packages/core/src'),
            '@ethervault/app': path.resolve(__dirname, 'packages/app/src')
        }
    }
});
