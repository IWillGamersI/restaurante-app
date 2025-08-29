const os = require("os");
const { spawn } = require("child_process");

// Descobre o IP local (IPv4 não interno)
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

const localIP = getLocalIP();
console.log(`\n🌍 Acesse no navegador: http://${localIP}:3000\n`);

// Roda o Next.js
const next = spawn("npx", ["next", "dev", "-H", "0.0.0.0", "-p", "3000"], {
  stdio: "inherit",
  shell: true,
});
