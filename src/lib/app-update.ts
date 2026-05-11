import { App as CapacitorApp } from '@capacitor/app'

import { isNativePluginAvailable } from '../native/capacitor-platform'

export const ANDROID_RELEASE_LATEST_URL = 'https://share.represt.app/api/releases/android/latest'

export type AppUpdateErrorReason = 'invalid' | 'network'

export type CurrentAppBuildInfo = {
  build: string | null
  version: string
  versionCode: number | null
}

export type AndroidReleaseInfo = {
  changelog: string
  downloadUrl: string
  sha256: string
  updatedAt: string
  version: string
  versionCode: number
}

export class AppUpdateError extends Error {
  readonly reason: AppUpdateErrorReason

  constructor(reason: AppUpdateErrorReason, message: string) {
    super(message)
    this.reason = reason
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readStringField(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readString(data[key])
    if (value) {
      return value
    }
  }

  return null
}

function readNumberField(data: Record<string, unknown>, key: string) {
  const value = data[key]

  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
  }

  return null
}

function readChangelog(data: Record<string, unknown>) {
  const changelog = data.changelog
  if (Array.isArray(changelog) && changelog.every((item) => typeof item === 'string')) {
    return changelog.join('\n').trim() || null
  }

  const releaseNotes = data.releaseNotes
  if (Array.isArray(releaseNotes) && releaseNotes.every((item) => typeof item === 'string')) {
    return releaseNotes.join('\n').trim() || null
  }

  return readStringField(data, ['changelog', 'releaseNotes', 'notes'])
}

export function parseVersionCode(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

function compareVersionName(a: string, b: string) {
  const aParts = a.split(/[.-]/).map((part) => Number(part))
  const bParts = b.split(/[.-]/).map((part) => Number(part))
  const length = Math.max(aParts.length, bParts.length)

  for (let index = 0; index < length; index += 1) {
    const aPart = Number.isFinite(aParts[index]) ? aParts[index] : 0
    const bPart = Number.isFinite(bParts[index]) ? bParts[index] : 0

    if (aPart !== bPart) {
      return aPart > bPart ? 1 : -1
    }
  }

  return 0
}

export function parseAndroidReleaseInfo(value: unknown): AndroidReleaseInfo {
  if (!isRecord(value)) {
    throw new AppUpdateError('invalid', 'Android release response is not an object.')
  }

  const version = readStringField(value, ['version', 'versionName'])
  const versionCode = readNumberField(value, 'versionCode')
  const updatedAt = readStringField(value, ['updatedAt', 'releaseDate', 'publishedAt', 'releasedAt'])
  const changelog = readChangelog(value)
  const sha256 = readStringField(value, ['sha256', 'apkSha256', 'sha256sum'])
  const downloadUrl = readStringField(value, ['downloadUrl', 'apkUrl'])

  if (!version || versionCode === null || !updatedAt || !changelog || !sha256 || !downloadUrl) {
    throw new AppUpdateError('invalid', 'Android release response is missing required fields.')
  }

  return { changelog, downloadUrl, sha256, updatedAt, version, versionCode }
}

export function isNewerRelease(
  release: Pick<AndroidReleaseInfo, 'version' | 'versionCode'>,
  current: CurrentAppBuildInfo,
) {
  if (current.versionCode !== null) {
    return release.versionCode > current.versionCode
  }

  return compareVersionName(release.version, current.version) > 0
}

export async function getCurrentAppBuildInfo(webVersion: string): Promise<CurrentAppBuildInfo> {
  if (!isNativePluginAvailable('App')) {
    return {
      build: null,
      version: webVersion,
      versionCode: parseVersionCode(webVersion),
    }
  }

  try {
    const info = await CapacitorApp.getInfo()
    const build = info.build || null

    return {
      build,
      version: info.version || webVersion,
      versionCode: parseVersionCode(build) ?? parseVersionCode(webVersion),
    }
  } catch {
    return {
      build: null,
      version: webVersion,
      versionCode: parseVersionCode(webVersion),
    }
  }
}

export function normalizeAppUpdateError(error: unknown): AppUpdateError {
  if (error instanceof AppUpdateError) {
    return error
  }

  return new AppUpdateError('network', 'Could not check for app updates.')
}

export async function fetchLatestAndroidRelease(fetcher: typeof fetch = fetch) {
  try {
    const response = await fetcher(ANDROID_RELEASE_LATEST_URL)
    if (!response.ok) {
      throw new AppUpdateError('network', `Android release request failed with ${response.status}.`)
    }

    return parseAndroidReleaseInfo(await response.json())
  } catch (error) {
    throw normalizeAppUpdateError(error)
  }
}
