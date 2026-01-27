
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

export const logger = {
    info: (...args: any[]) => {
        if (window.electronAPI?.log) {
            window.electronAPI.log.info(...args);
        } else {
            console.info(...args);
        }
    },
    warn: (...args: any[]) => {
        if (window.electronAPI?.log) {
            window.electronAPI.log.warn(...args);
        } else {
            console.warn(...args);
        }
    },
    error: (...args: any[]) => {
        if (window.electronAPI?.log) {
            window.electronAPI.log.error(...args);
        } else {
            console.error(...args);
        }
    },
    setEnabled: (enabled: boolean) => {
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
        return [];
    }
};
