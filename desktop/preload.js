"use strict";

/**
 * The only bridge between the Electron shell and the app. It exposes the
 * platform (so the window chrome can make room for the traffic lights) and a
 * subscription to native menu commands. Nothing else crosses over.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("proxima", {
  isDesktop: true,
  platform: process.platform,
  onMenuCommand(handler) {
    const listener = (_event, command) => handler(String(command));
    ipcRenderer.on("proxima:menu", listener);
    return () => ipcRenderer.removeListener("proxima:menu", listener);
  },
});
