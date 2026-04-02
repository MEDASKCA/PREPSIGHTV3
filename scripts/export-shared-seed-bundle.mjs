import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { createRequire } from "node:module"
import ts from "typescript"

const moduleCache = new Map()
const nodeRequire = createRequire(import.meta.url)

async function loadTsModule(filePath) {
  const resolvedPath = path.resolve(filePath)
  if (moduleCache.has(resolvedPath)) return moduleCache.get(resolvedPath)

  const source = await readFile(resolvedPath, "utf8")
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
    fileName: resolvedPath,
  })

  const module = { exports: {} }
  moduleCache.set(resolvedPath, module.exports)

  function createLocalRequire(basePath) {
    return (specifier) => {
      if (specifier.endsWith(".json")) {
        const jsonPath = path.resolve(path.dirname(basePath), specifier)
        return JSON.parse(nodeRequire("node:fs").readFileSync(jsonPath, "utf8"))
      }

      if (specifier.startsWith(".")) {
        const candidate = path.resolve(path.dirname(basePath), specifier)
        const tsPath = candidate.endsWith(".ts") ? candidate : `${candidate}.ts`
        const indexTsPath = path.join(candidate, "index.ts")
        if (nodeRequire("node:fs").existsSync(tsPath)) {
          return moduleCache.has(tsPath) ? moduleCache.get(tsPath) : requireTsSync(tsPath)
        }
        if (nodeRequire("node:fs").existsSync(indexTsPath)) {
          return moduleCache.has(indexTsPath) ? moduleCache.get(indexTsPath) : requireTsSync(indexTsPath)
        }
        return nodeRequire(candidate)
      }

      return nodeRequire(specifier)
    }
  }

  function requireTsSync(tsPath) {
    const raw = nodeRequire("node:fs").readFileSync(tsPath, "utf8")
    const out = ts.transpileModule(raw, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
      fileName: tsPath,
    })
    const nested = { exports: {} }
    moduleCache.set(tsPath, nested.exports)
    const fn = new Function("require", "module", "exports", out.outputText)
    fn(createLocalRequire(tsPath), nested, nested.exports)
    moduleCache.set(tsPath, nested.exports)
    return nested.exports
  }

  const fn = new Function("require", "module", "exports", transpiled.outputText)
  fn(createLocalRequire(resolvedPath), module, module.exports)
  moduleCache.set(resolvedPath, module.exports)
  return module.exports
}

const outDir = path.resolve(process.cwd(), "data", "shared-platform")
const outFile = path.join(outDir, "shared-seed-bundle.json")

async function main() {
  const { buildSharedRepositorySeedBundle } = await loadTsModule(
    path.resolve(process.cwd(), "src", "lib", "shared-repository-seed.ts"),
  )
  const bundle = buildSharedRepositorySeedBundle()
  await mkdir(outDir, { recursive: true })
  await writeFile(outFile, JSON.stringify(bundle, null, 2))
  console.log(`Wrote ${outFile}`)
  console.log(
    JSON.stringify(
      {
        repositories: bundle.repositories.length,
        taxonomyNodes: bundle.taxonomyNodes.length,
        canonicalProcedures: bundle.canonicalProcedures.length,
        procedureVersions: bundle.procedureVersions.length,
        publications: bundle.publications.length,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
