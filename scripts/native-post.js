const fs = require("fs")
const path = require("path")

const apiDir = path.join(__dirname, "..", "src", "app", "api")
const bakDir = path.join(__dirname, "..", "src", "app", "api.bak")

if (fs.existsSync(bakDir)) {
  if (fs.existsSync(apiDir)) fs.rmSync(apiDir, { recursive: true })
  fs.renameSync(bakDir, apiDir)
  console.log("native-post: restored src/app/api.bak → src/app/api")
}
