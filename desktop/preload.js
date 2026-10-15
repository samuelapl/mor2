const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isDesktop: true,
  platform: process.platform,
  version: "1.2.0",
  setServerUrl: (url) => ipcRenderer.invoke("set-server-url", url),
  getServerUrl: () => ipcRenderer.invoke("get-server-url"),
  retryConnection: () => ipcRenderer.invoke("retry-connection"),
  reload: () => ipcRenderer.invoke("reload-app"),
});

contextBridge.exposeInMainWorld("isElectron", true);

const markDesktop = () => {
  try {
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.setAttribute("data-is-desktop", "true");
      document.documentElement.classList.add("is-electron");
    }
  } catch (e) {}
};

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", markDesktop);
  } else {
    markDesktop();
  }
}