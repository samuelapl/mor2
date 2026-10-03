const fs = require("fs");
const path = require("path");

exports.default = async function afterPack(context) {
  const source = path.resolve(
    __dirname,
    "../frontend/.next/standalone/node_modules"
  );

  const destination = path.join(
    context.appOutDir,
    "resources",
    "standalone",
    "node_modules"
  );

  console.log("========================================");
  console.log("Copying Next.js standalone node_modules");
  console.log("Source:", source);
  console.log("Destination:", destination);
  console.log("========================================");

  if (!fs.existsSync(source)) {
    throw new Error(
      `Next.js standalone node_modules not found: ${source}`
    );
  }

  fs.cpSync(source, destination, {
    recursive: true,
    force: true
  });

  console.log("Next.js standalone node_modules copied successfully.");
};