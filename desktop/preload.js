const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isDesktop: true,
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