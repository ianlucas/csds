import { networkInterfaces } from "os";
export function getLocalIpAddress(port) {
    const interfaces = networkInterfaces();
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
