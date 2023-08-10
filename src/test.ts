import { CSGODS } from "./csds.js";

const csgods = new CSGODS("linux", "/home/ianlucas");

csgods.on("progress", (progress) => {
    console.log(progress);
});

await csgods.initialize();
