const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const root = path.join(__dirname, "..")
const appDir = path.join(root, "src", "app")
// Put backups OUTSIDE src/app so Next.js doesn't scan them
const bakRoot = path.join(root, ".native-build-bak")

// Directories inside src/app to exclude from native build
const excludeDirs = ["api", "dev"]

// Files inside src/app to exclude from native build
const excludeFiles = ["manifest.ts", "sitemap.ts", "robots.ts"]

function pre() {
  if (fs.existsSync(bakRoot)) fs.rmSync(bakRoot, { recursive: true, force: true })
  fs.mkdirSync(bakRoot, { recursive: true })

  for (const dir of excludeDirs) {
    const src = path.join(appDir, dir)
    if (fs.existsSync(src)) {
      fs.cpSync(src, path.join(bakRoot, dir), { recursive: true })
      fs.rmSync(src, { recursive: true, force: true })
      console.log(`Hidden src/app/${dir}`)
    }
  }

  for (const file of excludeFiles) {
    const src = path.join(appDir, file)
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(bakRoot, file))
      fs.rmSync(src)
      console.log(`Hidden src/app/${file}`)
    }
  }
}

function post() {
  if (!fs.existsSync(bakRoot)) return

  for (const dir of excludeDirs) {
    const bak = path.join(bakRoot, dir)
    const dst = path.join(appDir, dir)
    if (fs.existsSync(bak)) {
      if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true })
      fs.cpSync(bak, dst, { recursive: true })
      console.log(`Restored src/app/${dir}`)
    }
  }

  for (const file of excludeFiles) {
    const bak = path.join(bakRoot, file)
    if (fs.existsSync(bak)) {
      fs.copyFileSync(bak, path.join(appDir, file))
      console.log(`Restored src/app/${file}`)
    }
  }

  fs.rmSync(bakRoot, { recursive: true, force: true })
}

pre()

let buildFailed = false
try {
  execSync("cross-env CAPACITOR_BUILD=true next build", { stdio: "inherit", cwd: root })
} catch {
  buildFailed = true
}

post()

if (buildFailed) process.exit(1)
