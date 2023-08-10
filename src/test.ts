import { CSGODS, CSGODSState } from "./csds.js";

const csgods = new CSGODS("linux", "/home/ianlucas");

csgods.on("progress", (progress) => {
    console.log(progress);
});

csgods.on("state", (state) => {
    console.log(state);
    if (state === CSGODSState.READY) {
        csgods.start();
    }
    if (state === CSGODSState.ON) {
        console.log(csgods.localIpAddress);
        console.log(csgods.publicIpAddress);
    }
});

await csgods.initialize();
