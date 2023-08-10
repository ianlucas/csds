export declare class SteamCMD {
    private steamCMDPath;
    private steamCMDExecutable;
    private platform;
    constructor(platform: "win32" | "linux" | undefined, path: string);
    private download;
    private extract;
    initialize(): Promise<void>;
    run(commands: string, onData: (data: string) => void): Promise<boolean>;
}
