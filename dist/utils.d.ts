/// <reference types="node" />
export declare function mkdirRecursively(path: string): void;
export declare function rmByFileList(basePath: string, fileList: string): void;
export declare function extractZip(zipFilePath: string, destFolder: string): Promise<void>;
export declare function extractZipFromBuffer(zipFileBuffer: Buffer, destFolder: string): string;
export declare function extractTarGz(tarGzFilePath: string, destFolder: string): Promise<void>;
