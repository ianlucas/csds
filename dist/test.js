import { CSGODS, CSGODSState } from "./csds.js";
const csgods = new CSGODS("linux", "/home/ianlucas");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
csgods.on("progress", (progress) => {
    console.log(progress);
});
csgods.on("state", async (state) => {
    console.log(state);
    if (state === CSGODSState.READY) {
        csgods.start();
    }
    if (state === CSGODSState.ON) {
        console.log(csgods.localIpAddress);
        console.log(csgods.publicIpAddress);
        await sleep(10000);
        csgods.console("exit");
    }
});
await csgods.initialize();
