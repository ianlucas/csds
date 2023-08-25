/// <reference types="node" />
/// <reference types="node" />
import EventEmitter from "events";
export declare const CSGODS_APPID = 740;
export declare const CSGODS_STATUS_STALE = 0;
export declare const CSGODS_STATUS_UPDATING_STEAMCMD = 1;
export declare const CSGODS_STATUS_UPDATING_CSGODS = 2;
export declare const CSGODS_STATUS_READY = 3;
export declare const CSGODS_STATUS_GOING_ONLINE = 4;
export declare const CSGODS_STATUS_ONLINE = 5;
export declare const CSGODS_STATUS_GOING_OFFLINE = 6;
export declare interface CSGODS {
    on(event: "state", listener: (state: {
        status: number;
        progress: number;
    }) => void): this;
    on(event: "stdout", listener: (data: string) => void): this;
}
export interface CSGODSOptions {
    gsltToken?: string;
    steamApiKey?: string;
    port?: number;
    tvPort?: number;
    game?: string;
    console?: boolean;
    usercon?: boolean;
    gameType?: number;
    gameMode?: number;
    map?: string;
    tickrate?: number;
    maxPlayersOverride?: number;
    noRestart?: boolean;
    noBreakpad?: boolean;
    noCrashDialog?: boolean;
}
export declare const CSGODS_LAUNCH_OPTIONS_ARGUMENTS: {
    gsltToken: string;
    steamApiKey: string;
    port: string;
    tvPort: string;
    game: string;
    console: string;
    usercon: string;
    gameType: string;
    gameMode: string;
    map: string;
    tickrate: string;
    maxPlayersOverride: string;
    noRestart: string;
    noBreakpad: string;
    noCrashDialog: string;
};
export declare class CSGODS extends EventEmitter {
    state: {
        status: number;
        progress: number;
    };
    publicIpAddress?: string;
    localIpAddress?: string;
    private steamCMD;
    private csgoPath;
    private csgoAddonsPath;
    private csgoDSPath;
    private instance?;
    private executable;
    private options;
    constructor(platform: "linux" | "win32" | undefined, path: string, options?: CSGODSOptions);
    private setState;
    private updateSteamCMD;
    update(): Promise<void>;
    private fixCSGODS;
    private makeLaunchOptions;
    initialize(): Promise<void>;
    installAddon(pluginName: string, zipFileBuffer: Buffer): void;
    deleteAddon(pluginName: string): void;
    listAddons(): string[];
    writeFile(file: string, data: string): void;
    readFile(file: string): string;
    start(options?: CSGODSOptions): void;
    stop(force?: boolean): boolean;
    restart(): Promise<unknown>;
    retrieveStatus(): {
        on: boolean;
        localIpAddress: string | undefined;
        publicIpAddress: string | undefined;
    };
    sendConsoleCommand(line: string): boolean;
}
