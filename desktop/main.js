const { app, BrowserWindow, Menu } = require("electron");const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

let mainWindow;
let nextServer;

const NEXT_PORT = 3000;

function waitForServer(url, retries = 60) {
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on("error", () => {
        if (retries <= 0) {
          reject(new Error(`Server did not start: ${url}`));
          return;
        }

        retries--;

        setTimeout(check, 500);
      });
    };

    check();
  });
}

function startNextServer() {
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

  console.log("Node:", nodePath);
  console.log("Next.js:", standalonePath);

  nextServer = spawn(nodePath, [standalonePath], {
    cwd: path.dirname(standalonePath),

    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(NEXT_PORT),
      HOSTNAME: "localhost",
    },

    // IMPORTANT:
    // Prevent the bundled Node.js process from opening
    // a separate Windows console window.
    windowsHide: true,

    // Do not inherit the terminal/console.
    stdio: ["ignore", "pipe", "pipe"],

    shell: false,
  });

  // Keep Next.js logs available for debugging without
  // creating a visible console window.
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
    console.log(
      `Next.js process exited. code=${code}, signal=${signal}`
    );
  });
}

async function createWindow() {
  startNextServer();

  await waitForServer(`http://localhost:${NEXT_PORT}`);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await mainWindow.loadURL(`http://localhost:${NEXT_PORT}`);
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

app.on("window-all-closed", () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
});