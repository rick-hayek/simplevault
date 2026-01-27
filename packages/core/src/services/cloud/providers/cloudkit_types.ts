/**
 * Minimal CloudKit JS Type Definitions
 * Based on Apple CloudKit JS Reference
 */

export interface CloudKitConfig {
    containers: {
        containerIdentifier: string;
        apiTokenAuth?: {
            apiToken: string;
            persist?: boolean;
            signInButton?: {
                id: string;
                theme: 'black' | 'white';
            }
        };
        environment: 'development' | 'production';
    }[];
}

export interface CKRecord {
    recordType: string;
    recordName?: string;
    recordChangeTag?: string;
    fields: { [key: string]: { value: any } };
    created?: { timestamp: number; userRecordName: string };
    modified?: { timestamp: number; userRecordName: string };
}

export interface CKQueryResponse {
    records: CKRecord[];
    continuationMarker?: string;
}

export interface CKResponse {
    hasErrors: boolean;
    errors?: any[];
    records?: CKRecord[];
}

export interface CKDatabase {
    saveRecords(records: CKRecord[]): Promise<CKResponse>;
    deleteRecords(recordNames: string[]): Promise<CKResponse>;
    performQuery(query: { recordType: string }, options?: any): Promise<CKQueryResponse>;
}

export interface CKContainer {
    containerIdentifier: string;
    publicCloudDatabase: CKDatabase;
    privateCloudDatabase: CKDatabase;
    setUpAuth(): Promise<any>; // Returns promise resolving to user identity or null
}

export interface Window {
    CloudKit: {
        configure(config: CloudKitConfig): void;
        getDefaultContainer(): CKContainer;
    };
}
