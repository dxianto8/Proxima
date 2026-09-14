"use strict";

/**
 * Electron main process.
 *
 * The app ships the Next.js standalone server and runs it as a child process
 * bound to loopback, then points a BrowserWindow at it. That keeps the desktop
 * build byte-identical to the web app — same routes, same Canvas proxy — rather
 * than maintaining a second rendering path.
 */

const { app, BrowserWindow, Menu, shell, dialog, nativeTheme } = require("electron");
const { fork } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const http = require("node:http");

const isMac = process.platform === "darwin";
const isDev = !app.isPackaged;

/** Where the prepared Next server lives, packaged or straight from the repo. */
const SERVER_ROOT = isDev
  ? path.join(__dirname, "app")
  : path.join(process.resourcesPath, "app");
const SERVER_ENTRY = path.join(SERVER_ROOT, "server.js");

let serverProcess = null;
let serverOrigin = null;
let mainWindow = null;

/* ------------------------------------------------------------------ server */

function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function ping(origin) {
  return new Promise((resolve) => {
    const request = http.get(`${origin}/today`, (response) => {
      response.resume();
      resolve(response.statusCode !== undefined && response.statusCode < 500);
    });
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

async function waitForServer(origin, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await ping(origin)) return true;
    if (serverProcess && serverProcess.exitCode !== null) return false;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

async function startServer() {
  if (!fs.existsSync(SERVER_ENTRY)) {
    throw new Error(
      `The bundled server is missing at ${SERVER_ENTRY}.\n\n` +
        "Run `npm run desktop:prepare` before starting the desktop app.",
    );
  }

  const port = await findFreePort();
  const origin = `http://127.0.0.1:${port}`;

  serverProcess = fork(SERVER_ENTRY, [], {
    cwd: SERVER_ROOT,
    env: {
      ...process.env,
      // Loopback only: this server must never be reachable from the network.
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      NODE_ENV: "production",
      // Makes the Electron binary behave as plain Node for the child.
      ELECTRON_RUN_AS_NODE: "1",
    },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });

  serverProcess.stdout?.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
  serverProcess.stderr?.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));
  serverProcess.on("exit", (code) => {
    serverProcess = null;
    // A crash after startup leaves a dead window behind; don't pretend it works.
    if (code !== 0 && code !== null && mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox(
        "Proxima stopped unexpectedly",
        "The local Proxima server exited. Quit and reopen the app.",
      );
    }
  });

  if (!(await waitForServer(origin))) {
    throw new Error("The local Proxima server did not start in time.");
  }

  serverOrigin = origin;
  return origin;
}

function stopServer() {
  if (!serverProcess) return;
  const child = serverProcess;
  serverProcess = null;
  child.kill();
  // SIGKILL anything still hanging around a moment later.
  setTimeout(() => {
    if (child.exitCode === null) child.kill("SIGKILL");
  }, 2000).unref();
}

/* ------------------------------------------------------------------ window */

const boundsFile = () => path.join(app.getPath("userData"), "window-state.json");

function readBounds() {
  try {
    const saved = JSON.parse(fs.readFileSync(boundsFile(), "utf8"));
    if (typeof saved.width === "number" && typeof saved.height === "number") return saved;
  } catch {
    /* first run, or the file was removed */
  }
  return { width: 1280, height: 860 };
}

function saveBounds() {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMinimized()) return;
  try {
    fs.writeFileSync(boundsFile(), JSON.stringify(mainWindow.getNormalBounds()));
  } catch {
    /* not worth bothering the user about */
  }
}

function createWindow() {
  const bounds = readBounds();

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 380,
    minHeight: 520,
    title: "Proxima",
    // Inset traffic lights over the app's own chrome; the renderer reserves
    // room for them via the `--titlebar-h` custom property.
    titleBarStyle: isMac ? "hiddenInset" : "default",
    trafficLightPosition: isMac ? { x: 14, y: 14 } : undefined,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0d0f13" : "#f7f8fa",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("resize", saveBounds);
  mainWindow.on("move", saveBounds);
  mainWindow.on("close", saveBounds);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Anything that isn't the local app opens in the user's real browser —
  // Canvas links especially, which need their existing session.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (serverOrigin && url.startsWith(serverOrigin)) return;
    event.preventDefault();
    if (/^https?:/i.test(url)) void shell.openExternal(url);
  });

  return mainWindow;
}

/* -------------------------------------------------------------------- menu */

function send(command) {
  mainWindow?.webContents.send("proxima:menu", command);
}

function buildMenu() {
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Task",
          accelerator: "CmdOrCtrl+N",
          click: () => send("new-task"),
        },
        {
          label: "Search",
          accelerator: "CmdOrCtrl+F",
          click: () => send("search"),
        },
        { type: "separator" },
        {
          label: "Sync with Canvas",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => send("sync"),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        ...(isMac ? [{ role: "pasteAndMatchStyle" }] : []),
        { role: "delete" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Today", accelerator: "CmdOrCtrl+1", click: () => send("go:/today") },
        { label: "Upcoming", accelerator: "CmdOrCtrl+2", click: () => send("go:/upcoming") },
        { label: "All Tasks", accelerator: "CmdOrCtrl+3", click: () => send("go:/tasks") },
        { label: "Calendar", accelerator: "CmdOrCtrl+4", click: () => send("go:/calendar") },
        { label: "Courses", accelerator: "CmdOrCtrl+5", click: () => send("go:/courses") },
        { type: "separator" },
        { role: "reload" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(isDev ? [{ role: "toggleDevTools" }] : []),
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac ? [{ type: "separator" }, { role: "front" }] : []),
      ],
    },
    {
      role: "help",
      submenu: [
        {
          label: "Proxima on GitHub",
          click: () => void shell.openExternal("https://github.com/dxianto8/Proxima"),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ----------------------------------------------------------------- startup */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    buildMenu();
    const window = createWindow();
    void window.loadFile(path.join(__dirname, "loading.html"));

    try {
      const origin = await startServer();
      await window.loadURL(`${origin}/today`);
    } catch (error) {
      dialog.showErrorBox("Proxima could not start", String(error.message ?? error));
      app.quit();
      return;
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0 && serverOrigin) {
        void createWindow().loadURL(`${serverOrigin}/today`);
      }
    });
  });

  app.on("window-all-closed", () => {
    if (!isMac) app.quit();
  });

  app.on("before-quit", stopServer);
  app.on("will-quit", stopServer);
  process.on("exit", stopServer);
}
