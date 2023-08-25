"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawn = void 0;
const node_pty_1 = require("node-pty");
const childProcesses = [];
function killChildProcesses() {
    for (const childProcess of childProcesses) {
        childProcess.kill();
    }
}
function spawn(command, args) {
    const childProcess = (0, node_pty_1.spawn)(command, args, {});
    childProcesses.push(childProcess);
    return childProcess;
}
exports.spawn = spawn;
process.on("SIGINT", () => {
    killChildProcesses();
    process.exit();
});
process.once("exit", () => {
    killChildProcesses();
});
