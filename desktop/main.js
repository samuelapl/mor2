const { app, BrowserWindow, Menu, ipcMain, shell, session } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");

let mainWindow = null;
let currentTargetUrl = "http://localhost:3000";
let isConnected = false;

// Path to user-customizable server configuration file
function getConfigFilePath() {
  return path.join(app.getPath("userData"), "server-config.json");
}

function loadConfiguredUrl() {
  try {
    // 1. Command-line flag --server-url=...
    const arg = process.argv.find((a) => a.startsWith("--server-url="));
    if (arg) {
      return arg.split("=")[1].trim();
    }

    // 2. Environment variables
    if (process.env.LMS_WEB_URL) return process.env.LMS_WEB_URL.trim();
    if (process.env.WEB_APP_URL) return process.env.WEB_APP_URL.trim();

    // 3. User configuration file
    const configPath = getConfigFilePath();
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (data && typeof data.serverUrl === "string" && data.serverUrl.trim()) {
        return data.serverUrl.trim();
      }
    }
  } catch (err) {
    console.warn("[Config] Could not read server-config.json:", err);
  }

  // 4. Default web application URL
  return "http://localhost:3000";
}

function saveConfiguredUrl(url) {
  try {
    const configPath = getConfigFilePath();
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      configPath,
      JSON.stringify({ serverUrl: url.trim(), updatedAt: new Date().toISOString() }, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.error("[Config] Failed to save server-config.json:", err);
  }
}

// Fast check if target web server is responding
function checkServer(targetUrl) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const client = parsed.protocol === "https:" ? https : http;
      const req = client.get(
        targetUrl,
        {
          timeout: 2500,
          headers: {
            "User-Agent": "MoR-LMS-Desktop-Client/1.2.0",
          },
        },
        (res) => {
          res.resume();
          // Any standard HTTP status means server is up
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        }
      );
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

function getConnectingPageUrl() {
  return `file://${path.join(__dirname, "assets", "connecting.html")}`;
}

async function navigateToTarget() {
  if (!mainWindow || mainWindow.isDestroyed()) return false;

  const online = await checkServer(currentTargetUrl);
  if (online) {
    isConnected = true;
    console.log(`[Desktop] Connected to live web platform: ${currentTargetUrl}`);
    await mainWindow.loadURL(currentTargetUrl);
    return true;
  } else {
    isConnected = false;
    const currentUrl = mainWindow.webContents.getURL();
    if (!currentUrl.includes("connecting.html")) {
      console.log(`[Desktop] Server unreachable at ${currentTargetUrl}. Showing connecting screen...`);
      await mainWindow.loadURL(getConnectingPageUrl());
    }
    return false;
  }
}

function createWindow() {
  currentTargetUrl = loadConfiguredUrl();

  const iconPath =
    process.platform === "win32"
      ? path.join(__dirname, "assets", "mor-lms.ico")
      : path.join(__dirname, "assets", "mor-lms.png");

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: "MoR LMS",
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    backgroundColor: "#0f172a",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      spellcheck: false,
    },
  });

  // Smooth reveal
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Handle external links: open mailto or foreign links in system default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      const current = new URL(currentTargetUrl);
      if (parsed.origin !== current.origin) {
        shell.openExternal(url);
        return { action: "deny" };
      }
    } catch {}
    return { action: "allow" };
  });

  // If network drops or page crashes, show connection screen
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return; // Aborted by navigation
    console.warn(`[Desktop] Page load failure: ${validatedURL} (${errorCode}: ${errorDescription})`);
    if (isConnected) {
      isConnected = false;
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(getConnectingPageUrl());
        }
      }, 500);
    }
  });

  // Attempt initial connection
  navigateToTarget();
}

// ── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle("get-server-url", () => currentTargetUrl);

ipcMain.handle("set-server-url", async (_event, newUrl) => {
  if (!newUrl || typeof newUrl !== "string") return false;
  let formatted = newUrl.trim();
  if (!/^https?:\/\//i.test(formatted)) {
    formatted = `http://${formatted}`;
  }
  currentTargetUrl = formatted;
  saveConfiguredUrl(formatted);
  return navigateToTarget();
});

ipcMain.handle("retry-connection", async () => {
  return navigateToTarget();
});

ipcMain.handle("reload-app", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.reload();
  }
});

// ── Application Lifecycle ───────────────────────────────────────────────────
app.whenReady().then(() => {
  Menu.setApplicationMenu(null); // Clean kiosk header, no default Electron menu

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
