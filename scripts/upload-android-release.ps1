param(
  [string]$ReleaseDir = "D:\project\TrainRe\android\app\release",
  [string]$MetadataPath = "",
  [string]$LatestJsonPath = ".\latest.json",
  [string]$Bucket = "represt-android-releases",
  [string]$ObjectPrefix = "releases/android"
)

$ErrorActionPreference = "Stop"

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

function Invoke-R2Put {
  param(
    [string[]]$Arguments
  )

  & npx wrangler r2 object put @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "wrangler r2 object put failed with exit code $LASTEXITCODE."
  }
}

if (-not (Test-Path -LiteralPath $LatestJsonPath)) {
  throw "Cannot find $LatestJsonPath. Run scripts/generate-android-latest.ps1 first."
}

$metadataFile = Resolve-MetadataPath -ReleaseDir $ReleaseDir -MetadataPath $MetadataPath
$metadata = Get-Content -LiteralPath $metadataFile -Encoding utf8 -Raw | ConvertFrom-Json
$element = @($metadata.elements)[0]

if (-not $element) {
  throw "Cannot find release element in $metadataFile."
}

$latest = Get-Content -LiteralPath $LatestJsonPath -Encoding utf8 -Raw | ConvertFrom-Json
$apk = Join-Path $ReleaseDir ([string]$element.outputFile)
$fileName = [string]$latest.fileName

if (-not (Test-Path -LiteralPath $apk)) {
  throw "Cannot find APK: $apk."
}

if (-not $fileName) {
  throw "Missing fileName in $LatestJsonPath."
}

$size = (Get-Item -LiteralPath $apk).Length
$hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash

if ($size -ne [long]$latest.fileSizeBytes) {
  throw "APK size does not match $LatestJsonPath."
}

if ($hash -ne [string]$latest.sha256) {
  throw "APK SHA256 does not match $LatestJsonPath."
}

$apkObjectKey = "$Bucket/$ObjectPrefix/$fileName"
$latestObjectKey = "$Bucket/$ObjectPrefix/latest.json"
$contentDisposition = "attachment; filename=`"$fileName`""

Invoke-R2Put -Arguments @(
  $apkObjectKey,
  "--file", $apk,
  "--remote",
  "--content-type", "application/vnd.android.package-archive",
  "--content-disposition", $contentDisposition,
  "--cache-control", "public, max-age=31536000, immutable"
)

Invoke-R2Put -Arguments @(
  $latestObjectKey,
  "--file", $LatestJsonPath,
  "--remote",
  "--content-type", "application/json; charset=utf-8",
  "--cache-control", "no-store"
)

Write-Host "Uploaded Android release $($latest.versionName) ($($latest.versionCode))."
Write-Host "APK: $apkObjectKey"
Write-Host "Latest metadata: $latestObjectKey"
