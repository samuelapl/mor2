const { app, BrowserWindow, Menu } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const net = require("net");

let mainWindow;
let nextServer;
let activeServerUrl = "http://127.0.0.1:3005";

// Check if a specific TCP port is free
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, "127.0.0.1");
  });
}

// Find a free port starting from 3005 to avoid colliding with web dev server (3000) or backend (3001)
async function findAvailablePort(startPort = 3005) {
  let port = startPort;
  while (port < 3200) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  return startPort;
}

// Poll server until it responds to HTTP GET
function waitForServer(url, retries = 90) {
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on("error", () => {
        if (retries <= 0) {
          reject(new Error(`Server did not respond in time: ${url}`));
          return;
        }

        retries--;
        setTimeout(check, 350);
      });
    };

    check();
  });
}

async function startNextServer() {
  let nodePath;
  let standalonePath;

  if (app.isPackaged) {
    nodePath = path.join(process.resourcesPath, "node.exe");
    standalonePath = path.join(
      process.resourcesPath,
      "standalone",
      "server.js"
    );
  } else {
    nodePath = "C:\\Program Files\\nodejs\\node.exe";
    standalonePath = path.join(
      __dirname,
      "..",
      "frontend",
      ".next",
      "standalone",
      "server.js"
    );
  }

  // Assign a dedicated port (3005+) to prevent socket collision with web browser
  const port = await findAvailablePort(3005);
  activeServerUrl = `http://127.0.0.1:${port}`;

  console.log("Node:", nodePath);
  console.log("Next.js:", standalonePath);
  console.log("Desktop Server URL:", activeServerUrl);

  nextServer = spawn(nodePath, [standalonePath], {
    cwd: path.dirname(standalonePath),
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  nextServer.stdout.on("data", (data) => {
    console.log(`[Next.js] ${data.toString().trim()}`);
  });

  nextServer.stderr.on("data", (data) => {
    console.error(`[Next.js] ${data.toString().trim()}`);
  });

  nextServer.on("error", (error) => {
    console.error("Failed to start Next.js:", error);
  });

  nextServer.on("exit", (code, signal) => {
    console.log(`Next.js process exited. code=${code}, signal=${signal}`);
  });

  return activeServerUrl;
}

async function createWindow() {
  const serverUrl = await startNextServer();
  await waitForServer(serverUrl);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: "#ffffff",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Reveal window only once page is ready to show (prevents white canvas flicker)
  let shown = false;
  mainWindow.once("ready-to-show", () => {
    if (!shown) {
      shown = true;
      mainWindow.show();
    }
  });

  // Fallback safety: make sure window displays within 3 seconds
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !shown) {
      shown = true;
      mainWindow.show();
    }
  }, 3000);

  // Auto-recovery if load fails
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.warn(`[Electron] Page load failure: ${validatedURL} (${errorCode}: ${errorDescription})`);
    if (errorCode !== -3) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(activeServerUrl);
        }
      }, 1000);
    }
  });

  // Auto-recovery if render process crashes
  mainWindow.webContents.on("render-process-gone", (event, details) => {
    console.error("[Electron] Render process gone:", details);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(activeServerUrl);
    }
  });

  await mainWindow.loadURL(serverUrl);
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  try {
    await createWindow();
  } catch (error) {
    console.error("Failed to start MoR LMS Desktop:", error);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

function killNextServer() {
  if (nextServer) {
    try {
      if (process.platform === "win32" && nextServer.pid) {
        spawn("taskkill", ["/pid", String(nextServer.pid), "/T", "/F"], { windowsHide: true });
      } else {
        nextServer.kill();
      }
    } catch (e) {}
    nextServer = null;
  }
}

app.on("window-all-closed", () => {
  killNextServer();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  killNextServer();
});