"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalIpAddress = void 0;
const os_1 = require("os");
function getLocalIpAddress(port) {
    const interfaces = (0, os_1.networkInterfaces)();
    for (const interfaceName in interfaces) {
        const interfaceData = interfaces[interfaceName];
        if (interfaceData) {
            for (const info of interfaceData) {
                if (!info.internal && info.family === "IPv4") {
                    return port !== undefined
                        ? `${info.address}:${port}`
                        : info.address;
                }
            }
        }
    }
    return undefined;
}
exports.getLocalIpAddress = getLocalIpAddress;
