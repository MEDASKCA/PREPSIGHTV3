const fs = require("fs")
const path = require("path")

const apiDir = path.join(__dirname, "..", "src", "app", "api")
const bakDir = path.join(__dirname, "..", "src", "app", "api.bak")

if (fs.existsSync(apiDir)) {
  if (fs.existsSync(bakDir)) fs.rmSync(bakDir, { recursive: true, force: true })
  fs.cpSync(apiDir, bakDir, { recursive: true })
  fs.rmSync(apiDir, { recursive: true, force: true })
  console.log("native-pre: moved src/app/api → src/app/api.bak")
}
