$ErrorActionPreference = "Stop"

$ReleaseDir = "D:\project\TrainRe\android\app\release"
$MetadataPath = ""
$LatestJsonPath = ".\latest.json"
$Mandatory = $false
$DownloadBaseUrl = "https://share.represt.app/downloads/android"
$Changelog = @()

for ($index = 0; $index -lt $args.Count; $index += 1) {
  $argument = [string]$args[$index]

  switch ($argument) {
    "-ReleaseDir" {
      $index += 1
      $ReleaseDir = [string]$args[$index]
    }
    "-MetadataPath" {
      $index += 1
      $MetadataPath = [string]$args[$index]
    }
    "-LatestJsonPath" {
      $index += 1
      $LatestJsonPath = [string]$args[$index]
    }
    "-Mandatory" {
      $Mandatory = $true
    }
    "-DownloadBaseUrl" {
      $index += 1
      $DownloadBaseUrl = [string]$args[$index]
    }
    "-Changelog" {
      while (
        $index + 1 -lt $args.Count -and
        -not ([string]$args[$index + 1]).StartsWith("-")
      ) {
        $index += 1
        $Changelog += [string]$args[$index]
      }
    }
    default {
      throw "Unknown argument: $argument"
    }
  }
}

if ($Changelog.Count -eq 0) {
  $Changelog = @("这里写本次更新内容")
}

function Resolve-MetadataPath {
  param(
    [string]$ReleaseDir,
    [string]$MetadataPath
  )

  if ($MetadataPath) {
    return $MetadataPath
  }

  $defaultPath = Join-Path $ReleaseDir "output-metadata.json"
  if (Test-Path -LiteralPath $defaultPath) {
    return $defaultPath
  }

  $fallbackPath = Join-Path $ReleaseDir "output.json"
  if (Test-Path -LiteralPath $fallbackPath) {
    return $fallbackPath
  }

  throw "Cannot find output-metadata.json or output.json in $ReleaseDir."
}

$metadataFile = Resolve-MetadataPath -ReleaseDir $ReleaseDir -MetadataPath $MetadataPath
$metadata = Get-Content -LiteralPath $metadataFile -Encoding utf8 -Raw | ConvertFrom-Json
$element = @($metadata.elements)[0]

if (-not $element) {
  throw "Cannot find release element in $metadataFile."
}

$versionName = [string]$element.versionName
$versionCode = [int]$element.versionCode
$outputFile = [string]$element.outputFile

if (-not $versionName -or -not $versionCode -or -not $outputFile) {
  throw "Missing versionName, versionCode, or outputFile in $metadataFile."
}

$apk = Join-Path $ReleaseDir $outputFile
if (-not (Test-Path -LiteralPath $apk)) {
  throw "Cannot find APK: $apk."
}

$fileName = "represt-$versionName.apk"
$size = (Get-Item -LiteralPath $apk).Length
$hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
$releaseDate = Get-Date -Format "yyyy-MM-dd"

$latestJson = [ordered]@{
  platform = "android"
  versionName = $versionName
  versionCode = $versionCode
  releaseDate = $releaseDate
  downloadUrl = "$DownloadBaseUrl/latest"
  apkUrl = "$DownloadBaseUrl/$fileName"
  fileName = $fileName
  fileSizeBytes = $size
  sha256 = $hash
  changelog = $Changelog
  mandatory = [bool]$Mandatory
}

$latestJson |
  ConvertTo-Json -Depth 4 |
  Set-Content -LiteralPath $LatestJsonPath -Encoding utf8

Write-Host "Generated $LatestJsonPath for Android $versionName ($versionCode)."
Write-Host "APK: $apk"
