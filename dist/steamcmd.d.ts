export declare class SteamCMD {
    path: string;
    private executable;
    private platform;
    constructor(platform: "linux" | "win32" | undefined, path: string);
    private download;
    private extract;
    update(): Promise<void>;
    exec(commands: string, onData: (data: string) => void): Promise<boolean>;
    updateApp(path: string, appId: number, onProgress: (progress: {
        state: string;
        status: string;
        progress: number;
        current: number;
        total: number;
    }) => void): Promise<void>;
}
