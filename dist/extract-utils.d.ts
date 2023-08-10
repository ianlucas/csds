/// <reference types="node" />
export declare function extractZip(zipFilePath: string, destFolder: string): Promise<void>;
export declare function extractZipFromBuffer(zipFileBuffer: Buffer, destFolder: string): string;
export declare function extractTarGz(tarGzFilePath: string, destFolder: string): Promise<void>;
