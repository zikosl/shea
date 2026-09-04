import path from "node:path";
import process from "node:process";
import { Service } from "node-windows";

if (process.platform !== "win32") throw new Error("Windows service management is available only on Windows");

const command = process.argv[2];
if (command !== "install" && command !== "remove") {
  console.error("Usage: windows-service <install|remove>");
  process.exit(2);
}

const service = new Service({
  name: "Shea Local Gateway",
  description: "Coordinates shared stock and sales for Shea POS terminals on the store network.",
  script: path.join(__dirname, "server.js"),
  nodeOptions: ["--enable-source-maps"],
  wait: 2,
  grow: 0.25,
  maxRestarts: 10,
  abortOnError: false,
});

service.on("install", () => {
  service.start();
  console.log("Shea Local Gateway service installed and started");
});
service.on("uninstall", () => console.log("Shea Local Gateway service removed"));
service.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

if (command === "install") service.install();
else service.uninstall();
