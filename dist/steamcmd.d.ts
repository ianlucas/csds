export declare class SteamCMD {
    path: string;
    private executable;
    private platform;
    constructor(platform: "win32" | "linux" | undefined, path: string);
    private download;
    private extract;
    initialize(): Promise<void>;
    run(commands: string, onData: (data: string) => void): Promise<boolean>;
    update(appId: number, onProgress: (progress: {
        state: string;
        status: string;
        progress: number;
        current: number;
        total: number;
    }) => void): Promise<void>;
}
