import { spawn as nodeSpawn } from "child_process";
const childProcesses = [];
function killChildProcesses() {
    for (const childProcess of childProcesses) {
        childProcess.kill();
    }
}
export function spawn(command, args) {
    const childProcess = nodeSpawn(command, args);
    childProcesses.push(childProcess);
    return childProcess;
}
process.on("SIGINT", () => {
    killChildProcesses();
    process.exit();
});
process.once("exit", () => {
    killChildProcesses();
});
