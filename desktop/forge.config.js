module.exports = {
  packagerConfig: {
    asar: true,

    name: "MoR LMS",
    executableName: "mor-lms",
    icon: "./assets/mor-lms",
    electronZipDir: "./electron-cache",

    extraResource: [
      "../frontend/.next/standalone",
      "runtime/node.exe",
    ],
  },

  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "mor_lms",
        authors: "MoR Tele ELTMS",
        description: "MoR Tele ELTMS Desktop Application",
        setupExe: "MoR-LMS-Setup.exe",
        setupIcon: "./assets/mor-lms.ico",
      },
    },
  ],
};