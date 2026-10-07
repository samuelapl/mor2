export {};

declare global {
  interface Window {
    electronAPI?: {
      isDesktop: boolean;
    };
    isElectron?: boolean;
    __IS_ELECTRON__?: boolean;
  }
}