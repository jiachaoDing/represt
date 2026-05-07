import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const rootDir = dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const sourceLogoPath = await resolveSourceLogoPath()
const sourceMaskableLogoPath = await resolveOptionalSourcePath('logo-maskable.png')
const publicDir = join(rootDir, 'public')
const androidResDir = join(rootDir, 'android', 'app', 'src', 'main', 'res')
const iconBackgroundColor = '#E2E8F0'
const splashBackgroundColor = '#F5F7FB'
const splashBackgroundColorDark = '#0F172A'
const iconDensities = [
  ['mipmap-ldpi', 36],
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
]
const splashTargets = [
  ['drawable', 320, 480, splashBackgroundColor],
  ['drawable-night', 320, 240, splashBackgroundColorDark],
  ['drawable-port-ldpi', 240, 320, splashBackgroundColor],
  ['drawable-port-mdpi', 320, 480, splashBackgroundColor],
  ['drawable-port-hdpi', 480, 800, splashBackgroundColor],
  ['drawable-port-xhdpi', 720, 1280, splashBackgroundColor],
  ['drawable-port-xxhdpi', 960, 1600, splashBackgroundColor],
  ['drawable-port-xxxhdpi', 1280, 1920, splashBackgroundColor],
  ['drawable-land-ldpi', 320, 240, splashBackgroundColor],
  ['drawable-land-mdpi', 480, 320, splashBackgroundColor],
  ['drawable-land-hdpi', 800, 480, splashBackgroundColor],
  ['drawable-land-xhdpi', 1280, 720, splashBackgroundColor],
  ['drawable-land-xxhdpi', 1600, 960, splashBackgroundColor],
  ['drawable-land-xxxhdpi', 1920, 1280, splashBackgroundColor],
]
const logoPng = await sharp(sourceLogoPath).resize(512, 512).png().toBuffer()
const maskableLogoPng = await sharp(sourceMaskableLogoPath ?? sourceLogoPath).resize(512, 512).png().toBuffer()

await mkdir(publicDir, { recursive: true })
await writeFile(join(publicDir, 'icon.png'), logoPng)
await writeFile(join(publicDir, 'icon-maskable.png'), maskableLogoPng)
await writeAndroidAssets(logoPng)

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

async function writeAndroidAssets(sourcePng) {
  await writeAdaptiveIconXml()

  for (const [dirName, size] of iconDensities) {
    const dir = join(androidResDir, dirName)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'ic_launcher_background.png'), await solidPng(size, size, iconBackgroundColor))
    await writeFile(join(dir, 'ic_launcher_foreground.png'), await resizePng(sourcePng, size))
    await writeFile(join(dir, 'ic_launcher.png'), await iconPng(sourcePng, size, false))
    await writeFile(join(dir, 'ic_launcher_round.png'), await iconPng(sourcePng, size, true))
  }

  for (const [dirName, width, height, color] of splashTargets) {
    await writeSplash(dirName, width, height, color, sourcePng)

    if (dirName.includes('-port-') || dirName.includes('-land-')) {
      const nightDirName = dirName.replace('-port-', '-port-night-').replace('-land-', '-land-night-')
      await writeSplash(nightDirName, width, height, splashBackgroundColorDark, sourcePng)
    }
  }
}

async function writeAdaptiveIconXml() {
  const dir = join(androidResDir, 'mipmap-anydpi-v26')
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background>
        <inset android:drawable="@mipmap/ic_launcher_background" android:inset="16.7%" />
    </background>
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" />
    </foreground>
</adaptive-icon>`

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'ic_launcher.xml'), xml, 'utf8')
  await writeFile(join(dir, 'ic_launcher_round.xml'), xml, 'utf8')
}

async function writeSplash(dirName, width, height, color, sourcePng) {
  const dir = join(androidResDir, dirName)
  const logoSize = Math.floor(width * 0.24)
  const logo = await resizePng(sourcePng, logoSize)
  const splash = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: color,
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer()

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'splash.png'), splash)
}

async function iconPng(sourcePng, size, round) {
  const iconSize = round ? size : Math.round(size * 0.67)
  const icon = await resizePng(sourcePng, iconSize)

  if (round) {
    return sharp(icon)
      .ensureAlpha()
      .composite([{ input: circleMask(size), blend: 'dest-in' }])
      .png()
      .toBuffer()
  }

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toBuffer()
}

function resizePng(sourcePng, size) {
  return sharp(sourcePng).resize(size, size).png().toBuffer()
}

function solidPng(width, height, color) {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: color,
    },
  })
    .png()
    .toBuffer()
}

function circleMask(size) {
  const radius = size / 2
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="#fff"/></svg>`
  return Buffer.from(svg)
}
