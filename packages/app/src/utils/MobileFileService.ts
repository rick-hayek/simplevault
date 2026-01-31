import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';

export const MobileFileService = {
    /**
     * Export content to a file.
     * User requested to stop using Share and use manual directory picking.
     */
    /**
     * Export content to a file.
     * User requested to stop using Share and use manual directory picking.
     */
    async exportFile(filename: string, content: string): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) {
            return false;
        }
        // Direct fallback to manual save as requested
        return await this.saveAsFile(filename, content);
    },

    /**
     * Save to Downloads (Android) or Documents (iOS)
     */
    async saveAsFile(filename: string, content: string): Promise<boolean> {
        try {
            const platform = Capacitor.getPlatform();

            if (platform === 'android') {
                // Android: Save to 'Download' folder in External Storage
                await Filesystem.writeFile({
                    path: 'Download/' + filename,
                    data: content,
                    directory: Directory.ExternalStorage,
                    encoding: Encoding.UTF8,
                    recursive: true
                });

                return true;
            } else {
                // iOS: Save to Documents (accessible via Files app)
                await Filesystem.writeFile({
                    path: filename,
                    data: content,
                    directory: Directory.Documents,
                    encoding: Encoding.UTF8
                });

                return true;
            }
        } catch (e: any) {
            console.error('[MobileFileService] Save failed', e);

            throw new Error(e.message);
        }
    },

    /**
     * Pick a file using native file picker.
     * @returns File name and string content, or null if cancelled/not native.
     */
    async pickFile(): Promise<{ name: string; content: string } | null> {
        if (!Capacitor.isNativePlatform()) {
            return null;
        }

        try {
            const result = await FilePicker.pickFiles({
                types: ['application/json', 'text/csv'],
                readData: true
            });

            if (!result.files || result.files.length === 0) return null;

            const file = result.files[0];

            // data is base64
            if (!file.data) {
                throw new Error('Could not read file data. Please try again.');
            }

            // Decode base64
            const content = atob(file.data);

            return {
                name: file.name || 'imported_file',
                content: content
            };
        } catch (e: any) {
            // User cancelled
            if (e.message?.includes('canceled') || e.message?.includes('cancelled')) {
                return null;
            }
            console.error('[MobileFileService] Pick failed', e);
            throw new Error(e.message || 'Failed to pick file');
        }
    }
};
