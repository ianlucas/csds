"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSGODS = exports.CSGODS_LAUNCH_OPTIONS_ARGUMENTS = exports.CSGODS_STATUS_GOING_OFFLINE = exports.CSGODS_STATUS_ONLINE = exports.CSGODS_STATUS_GOING_ONLINE = exports.CSGODS_STATUS_READY = exports.CSGODS_STATUS_UPDATING_CSGODS = exports.CSGODS_STATUS_UPDATING_STEAMCMD = exports.CSGODS_STATUS_STALE = exports.CSGODS_APPID = void 0;
const events_1 = __importDefault(require("events"));
const fs_1 = require("fs");
const path_1 = require("path");
const child_process_utils_js_1 = require("./child-process-utils.js");
const extract_utils_js_1 = require("./extract-utils.js");
const fs_utils_js_1 = require("./fs-utils.js");
const os_utils_js_1 = require("./os-utils.js");
const steamcmd_js_1 = require("./steamcmd.js");
const serverPublicIpRE = /Public IP is (\d+\.\d+\.\d+\.\d+)/;
const serverOnRE = /GC Connection established for server/;
exports.CSGODS_APPID = 740;
exports.CSGODS_STATUS_STALE = 0;
exports.CSGODS_STATUS_UPDATING_STEAMCMD = 1;
exports.CSGODS_STATUS_UPDATING_CSGODS = 2;
exports.CSGODS_STATUS_READY = 3;
exports.CSGODS_STATUS_GOING_ONLINE = 4;
exports.CSGODS_STATUS_ONLINE = 5;
exports.CSGODS_STATUS_GOING_OFFLINE = 6;
exports.CSGODS_LAUNCH_OPTIONS_ARGUMENTS = {
    gsltToken: "+sv_setsteamaccount",
    steamApiKey: "-authkey",
    port: "-port",
    tvPort: "+tv_port",
    game: "-game",
    console: "-console",
    usercon: "-usercon",
    gameType: "+game_type",
    gameMode: "+game_mode",
    map: "+map",
    tickrate: "-tickrate",
    maxPlayersOverride: "-maxplayers_override",
    noRestart: "-norestart",
    noBreakpad: "-nobreakpad",
    noCrashDialog: "-nocrashdialog"
};
class CSGODS extends events_1.default {
    constructor(platform = "linux", path, options) {
        super();
        this.state = {
            status: exports.CSGODS_STATUS_STALE,
            progress: 0
        };
        this.options = {
            port: 27015,
            tvPort: 27020,
            game: "csgo",
            console: true,
            usercon: true,
            gameType: 0,
            gameMode: 1,
            map: "de_dust2",
            tickrate: 128,
            maxPlayersOverride: 12,
            noRestart: true,
            noBreakpad: true,
            noCrashDialog: true
        };
        this.steamCMD = new steamcmd_js_1.SteamCMD(platform, path);
        this.csgoAddonsPath = (0, path_1.join)(path, ".steamcmd/plugins");
        this.csgoDSPath = (0, path_1.join)(this.steamCMD.path, "steamcmd");
        this.executable = (0, path_1.join)(this.csgoDSPath, platform === "win32" ? "srcds.exe" : "srcds_run");
        this.options = Object.assign(Object.assign({}, this.options), options);
        this.csgoPath = (0, path_1.join)(this.csgoDSPath, "csgo");
    }
    setState(state) {
        Object.assign(this.state, state);
        this.emit("state", this.state);
    }
    updateSteamCMD() {
        return __awaiter(this, void 0, void 0, function* () {
            this.setState({ status: exports.CSGODS_STATUS_UPDATING_STEAMCMD });
            yield this.steamCMD.update();
        });
    }
    update() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.state.status === exports.CSGODS_STATUS_UPDATING_STEAMCMD
                || this.state.status === exports.CSGODS_STATUS_READY) {
                this.setState({ status: exports.CSGODS_STATUS_UPDATING_CSGODS });
                yield this.steamCMD.updateApp(exports.CSGODS_APPID, ({ progress }) => {
                    this.setState({ progress });
                });
                this.fixCSGODS();
                this.setState({ status: exports.CSGODS_STATUS_READY });
            }
        });
    }
    /// @see https://github.com/GameServerManagers/LinuxGSM/blob/master/lgsm/functions/fix_csgo.sh
    fixCSGODS() {
        const libgccPath = (0, path_1.join)(this.csgoDSPath, "bin/libgcc_s.so.1");
        if ((0, fs_1.existsSync)(libgccPath)) {
            (0, fs_1.renameSync)(libgccPath, `${libgccPath}.bak`);
        }
    }
    makeLaunchOptions(options) {
        return Object.keys(options).map(key => {
            const value = options[key];
            const argumentName = exports.CSGODS_LAUNCH_OPTIONS_ARGUMENTS[key];
            if (typeof value === "boolean") {
                return value ? argumentName : "";
            }
            if (typeof value === undefined) {
                return "";
            }
            return `${argumentName} ${value}`;
        }).filter(Boolean).join(" ");
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateSteamCMD();
            if (!(0, fs_1.existsSync)(this.csgoAddonsPath)) {
                (0, fs_utils_js_1.mkdirRecursive)(this.csgoAddonsPath);
            }
            yield this.update();
        });
    }
    installAddon(pluginName, zipFileBuffer) {
        const fileList = (0, extract_utils_js_1.extractZipFromBuffer)(zipFileBuffer, this.csgoPath);
        const fileListPath = (0, path_1.resolve)(this.csgoAddonsPath, `${pluginName}.txt`);
        (0, fs_1.writeFileSync)(fileListPath, fileList, { encoding: "utf-8" });
    }
    deleteAddon(pluginName) {
        const fileListPath = (0, path_1.resolve)(this.csgoAddonsPath, `${pluginName}.txt`);
        if ((0, fs_1.existsSync)(fileListPath)) {
            const fileList = (0, fs_1.readFileSync)(fileListPath, { encoding: "utf-8" });
            (0, fs_utils_js_1.rmByFileList)(this.csgoPath, fileList);
            (0, fs_1.unlinkSync)(fileListPath);
        }
    }
    listAddons() {
        return (0, fs_1.readdirSync)(this.csgoAddonsPath).map((fileName) => {
            return fileName.replace(/\.txt$/, "");
        });
    }
    writeFile(file, data) {
        (0, fs_1.writeFileSync)((0, path_1.resolve)(this.csgoPath, file), data, {
            encoding: "utf-8"
        });
    }
    readFile(file) {
        return (0, fs_1.readFileSync)((0, path_1.resolve)(this.csgoPath, file), {
            encoding: "utf-8"
        });
    }
    start(options) {
        if (!this.instance && this.state.status === exports.CSGODS_STATUS_READY) {
            this.setState({ status: exports.CSGODS_STATUS_GOING_ONLINE });
            const launchOptions = this.makeLaunchOptions(Object.assign(Object.assign({}, this.options), options));
            console.log(`Starting server with launch options: ${launchOptions}`);
            this.instance = (0, child_process_utils_js_1.spawn)(this.executable, launchOptions.split(" "));
            this.instance.onExit(() => {
                this.instance = undefined;
                this.setState({ status: exports.CSGODS_STATUS_READY });
            });
            this.instance.onData((raw) => {
                var _a, _b;
                const data = raw.toString();
                const publicIpMatch = data.match(serverPublicIpRE);
                if (data.match(serverOnRE)) {
                    this.setState({ status: exports.CSGODS_STATUS_ONLINE });
                }
                if (publicIpMatch) {
                    this.publicIpAddress = `${publicIpMatch[1]}:${(_a = this.options) === null || _a === void 0 ? void 0 : _a.port}`;
                    this.localIpAddress = (0, os_utils_js_1.getLocalIpAddress)((_b = this.options) === null || _b === void 0 ? void 0 : _b.port);
                }
                this.emit("stdout", data);
            });
        }
    }
    stop(force = false) {
        if (this.instance !== undefined
            && (force || this.state.status === exports.CSGODS_STATUS_ONLINE)) {
            this.setState({ status: exports.CSGODS_STATUS_GOING_OFFLINE });
            if (force) {
                this.instance.kill();
            }
            else {
                this.sendConsoleCommand("exit");
            }
            return true;
        }
        return false;
    }
    restart() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                const listener = ({ status }) => {
                    if (status === exports.CSGODS_STATUS_ONLINE) {
                        this.off("state", listener);
                        resolve(true);
                    }
                };
                this.on("state", listener);
                this.stop();
                this.start();
            });
        });
    }
    retrieveStatus() {
        return {
            on: this.state.status === exports.CSGODS_STATUS_ONLINE,
            localIpAddress: this.localIpAddress,
            publicIpAddress: this.publicIpAddress
        };
    }
    sendConsoleCommand(line) {
        if (this.instance !== undefined) {
            this.instance.write(`${line}\n`);
            return true;
        }
        return false;
    }
}
exports.CSGODS = CSGODS;
