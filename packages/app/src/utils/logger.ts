
declare global {
    interface Window {
        electronAPI?: {
            log: {
                info: (...args: any[]) => void;
                warn: (...args: any[]) => void;
                error: (...args: any[]) => void;
                setEnabled: (enabled: boolean) => void;
                openLogFile: () => void;
                getRecentLogs: () => Promise<string[]>;
            };
            // ... allow other props
            [key: string]: any;
        };
    }
}

const LOG_STORAGE_KEY = 'ethervault_logs';
const MAX_LOG_LINES = 50;
let isLoggingEnabled = true;

const saveToLocalLog = (level: string, ...args: any[]) => {
    if (!isLoggingEnabled) return;

    try {
        const message = args.map(arg => {
            if (arg instanceof Error) return arg.message;
            if (typeof arg === 'object') return JSON.stringify(arg);
            return String(arg);
        }).join(' ');

        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] [${level}] ${message}`;

        const storedLogs = localStorage.getItem(LOG_STORAGE_KEY);
        let logs: string[] = storedLogs ? JSON.parse(storedLogs) : [];

        logs.push(logLine);
        if (logs.length > MAX_LOG_LINES) {
            logs = logs.slice(-MAX_LOG_LINES);
        }

        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
        console.error('Failed to save log locally', e);
    }
};

export const logger = {
    info: (...args: any[]) => {
        if (window.electronAPI?.log) {
            window.electronAPI.log.info(...args);
        } else {
            saveToLocalLog('info', ...args);
            console.info(...args);
        }
    },
    warn: (...args: any[]) => {
        if (window.electronAPI?.log) {
            window.electronAPI.log.warn(...args);
        } else {
            saveToLocalLog('warn', ...args);
            console.warn(...args);
        }
    },
    error: (...args: any[]) => {
        if (window.electronAPI?.log) {
            window.electronAPI.log.error(...args);
        } else {
            saveToLocalLog('error', ...args);
            console.error(...args);
        }
    },
    setEnabled: (enabled: boolean) => {
        isLoggingEnabled = enabled;
        if (window.electronAPI?.log?.setEnabled) {
            window.electronAPI.log.setEnabled(enabled);
        }
    },
    openLogFile: () => {
        if (window.electronAPI?.log?.openLogFile) {
            window.electronAPI.log.openLogFile();
        }
    },
    getRecentLogs: async (): Promise<string[]> => {
        if (window.electronAPI?.log?.getRecentLogs) {
            return await window.electronAPI.log.getRecentLogs();
        }
        // Fallback for web/mobile
        try {
            const storedLogs = localStorage.getItem(LOG_STORAGE_KEY);
            return storedLogs ? JSON.parse(storedLogs).reverse() : [];
        } catch (e) {
            return [];
        }
    }
};
