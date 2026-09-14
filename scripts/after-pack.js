"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * Copies the staged Next server (`desktop/app`) into the packaged app's
 * Resources directory.
 *
 * This can't be done with electron-builder's `extraResources`: it filters
 * `node_modules` out of anything it copies, which would ship `server.js`
 * without the dependencies it needs. Copying here keeps the ordinary
 * `node_modules` layout so Node's resolver works with no `NODE_PATH` tricks.
 */
module.exports = async function afterPack(context) {
  const { appOutDir, packager, electronPlatformName } = context;
  const projectDir = packager.info.projectDir;
  const source = path.join(projectDir, "desktop", "app");

  if (!fs.existsSync(path.join(source, "server.js"))) {
    throw new Error(
      `desktop/app/server.js is missing — run "npm run desktop:prepare" before packaging.`,
    );
  }

  const resources =
    electronPlatformName === "darwin"
      ? path.join(appOutDir, `${packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(appOutDir, "resources");

  const target = path.join(resources, "app");
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true, dereference: true });

  const entry = path.join(target, "server.js");
  if (!fs.existsSync(entry) || !fs.existsSync(path.join(target, "node_modules", "next"))) {
    throw new Error(`The bundled server did not copy cleanly into ${target}.`);
  }
  console.log(`  • bundled Next server  path=${path.relative(projectDir, target)}`);
};
