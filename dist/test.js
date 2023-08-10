import { CSGODS } from "./csds.js";
const csgods = new CSGODS("linux", "/home/ianlucas");
csgods.on("progress", (progress) => {
    console.log(progress);
});
csgods.on("steamcmd:data", (data) => {
    console.log(data);
});
await csgods.initialize();
