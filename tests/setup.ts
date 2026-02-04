import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// Global test utilities
globalThis.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
globalThis.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');

