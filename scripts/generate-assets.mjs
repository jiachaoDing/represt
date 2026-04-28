import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import sharp from 'sharp'

const rootDir = dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const sourceLogoPath = await resolveSourceLogoPath()
const sourceMaskableLogoPath = await resolveOptionalSourcePath('logo-maskable.png')
const androidManifestPath = join(rootDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml')
const publicDir = join(rootDir, 'public')
const logoPng = await sharp(sourceLogoPath).resize(512, 512).png().toBuffer()
const maskableLogoPng = await sharp(sourceMaskableLogoPath ?? sourceLogoPath).resize(512, 512).png().toBuffer()
const androidManifestXml = await readFile(androidManifestPath, 'utf8')

await mkdir(publicDir, { recursive: true })
await writeFile(join(publicDir, 'icon.png'), logoPng)
await writeFile(join(publicDir, 'icon-maskable.png'), maskableLogoPng)

const workDirName = '.asset-work'
const workDir = join(rootDir, workDirName)

try {
  await rm(workDir, { recursive: true, force: true })
  await mkdir(workDir, { recursive: true })
  await writeFile(join(workDir, 'logo.png'), logoPng)
  await writeFile(join(workDir, 'icon-only.png'), logoPng)
  await writeFile(join(workDir, 'icon-foreground.png'), logoPng)
  await writeFile(
    join(workDir, 'icon-background.svg'),
    '<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" fill="#E2E8F0"/></svg>',
    'utf8',
  )

  await run(process.execPath, [
    join(rootDir, 'node_modules', '@capacitor', 'assets', 'bin', 'capacitor-assets'),
    'generate',
    '--android',
    `--assetPath=${workDirName}`,
    '--logoSplashScale=0.24',
    '--splashBackgroundColor=#F5F7FB',
    '--splashBackgroundColorDark=#0F172A',
  ])

  await writeFile(androidManifestPath, androidManifestXml, 'utf8')
} finally {
  await rm(workDir, { recursive: true, force: true })
}

async function resolveSourceLogoPath() {
  const pngPath = join(rootDir, 'assets', 'logo.png')
  const svgPath = join(rootDir, 'assets', 'logo.svg')

  try {
    await readFile(pngPath)
    return pngPath
  } catch {
    return svgPath
  }
}

async function resolveOptionalSourcePath(fileName) {
  const filePath = join(rootDir, 'assets', fileName)

  try {
    await access(filePath)
    return filePath
  } catch {
    return null
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      shell: false,
      stdio: 'inherit',
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} exited with code ${code}`))
      }
    })
  })
}
