import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { zipSync } from 'fflate'

const files = {}
for (const name of ['plugin.json', 'mcp.json']) {
  files[name] = new Uint8Array(await readFile(new URL(`../plugin/${name}`, import.meta.url)))
}
await mkdir(new URL('../assets/', import.meta.url), { recursive: true })
await writeFile(new URL('../assets/represt-plugin.bin', import.meta.url), zipSync(files, { level: 6 }))
