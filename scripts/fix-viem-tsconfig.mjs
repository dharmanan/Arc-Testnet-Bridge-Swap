import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..')
const targetPath = resolve(repoRoot, 'node_modules', 'tsconfig.base.json')

try {
  await access(targetPath)
} catch {
  await mkdir(dirname(targetPath), { recursive: true })
  await writeFile(targetPath, '{\n  "compilerOptions": {}\n}\n', 'utf8')
}