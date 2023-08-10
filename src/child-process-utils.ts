import { ChildProcess, spawn as nodeSpawn, SpawnOptionsWithoutStdio } from "child_process";
import { IPty, spawn as ptySpawn } from "node-pty";

const childProcesses: IPty[] = [];

function killChildProcesses() {
    for (const childProcess of childProcesses) {
        childProcess.kill();
    }
}

export function spawn(
    command: string,
    args: string[]
) {
    const childProcess = ptySpawn(command, args, {});
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
