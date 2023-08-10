/// <reference types="node" />
/// <reference types="node" />
import EventEmitter from "events";
export declare enum CSGODSState {
    UNINITIALIZED = 0,
    INITIALIZING_STEAMCMD = 1,
    UPDATING_CSGODS = 2,
    READY = 3,
    TURNING_ON = 4,
    ON = 5,
    TURNING_OFF = 6
}
export declare interface CSGODS {
    on(event: "state", listener: (state: CSGODSState) => void): this;
    on(event: "progress", listener: (progress: {
        state: string;
        status: string;
        progress: number;
        current: number;
        total: number;
    }) => void): this;
    on(event: "stdout", listener: (data: string) => void): this;
}
interface CSGODSOptions {
    launch: string;
    gsltToken?: string;
    steamApiKey?: string;
    port?: number;
    tvPort?: number;
}
export declare class CSGODS extends EventEmitter {
    state: CSGODSState;
    publicIpAddress?: string;
    localIpAddress?: string;
    private steamCMD;
    private csgoPath;
    private csgoAddonsPath;
    private csgoDSPath;
    private instance?;
    private executable;
    options: CSGODSOptions;
    constructor(platform: "win32" | "linux" | undefined, path: string, options?: CSGODSOptions);
    private setState;
    private initializeSteamCMD;
    updateCSGODS(): Promise<void>;
    private fixCSGODS;
    initialize(): Promise<void>;
    installAddon(pluginName: string, zipFileBuffer: Buffer): void;
    deleteAddon(pluginName: string): void;
    listAddons(): string[];
    write(file: string, data: string): void;
    read(file: string): string;
    isOn(): boolean;
    start(): void;
    stop(force?: boolean): boolean;
    console(line: string): boolean;
}
export {};
