[CmdletBinding()]
param(
  [string]$Version = "1.0.0",
  [string]$ReleaseRoot = "G:\Windows10-11V1.9\OpenSourceToolbox\Releases"
)

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$releaseRootFull = [IO.Path]::GetFullPath($ReleaseRoot)
New-Item -ItemType Directory -Path $releaseRootFull -Force | Out-Null

$stagingRoot = Join-Path $releaseRootFull ("staging-" + [guid]::NewGuid().ToString("N"))
$packageName = "liquid-glass-kit-v$Version"
$packageRoot = Join-Path $stagingRoot $packageName
$zipPath = Join-Path $releaseRootFull "$packageName.zip"
New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null

try {
  foreach ($relativePath in (git -C $repositoryRoot ls-files)) {
    $sourcePath = Join-Path $repositoryRoot $relativePath
    $destinationPath = Join-Path $packageRoot $relativePath
    New-Item -ItemType Directory -Path (Split-Path -Parent $destinationPath) -Force | Out-Null
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
  }

  Copy-Item -LiteralPath (Join-Path $repositoryRoot "dist") -Destination (Join-Path $packageRoot "dist") -Recurse -Force
  Compress-Archive -Path $packageRoot -DestinationPath $zipPath -CompressionLevel Optimal -Force

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
  try {
    $entryNames = $archive.Entries.FullName -replace "\\", "/"
    $requiredEntries = @(
      "$packageName/README.md",
      "$packageName/dist/liquid-glass-kit.js",
      "$packageName/dist/react/index.js",
      "$packageName/docs/EISLAND_COMPATIBILITY.md"
    )
    foreach ($requiredEntry in $requiredEntries) {
      if ($entryNames -notcontains $requiredEntry) {
        throw "ZIP entry missing: $requiredEntry"
      }
    }
    $entryCount = $archive.Entries.Count
  } finally {
    $archive.Dispose()
  }

  $zip = Get-Item -LiteralPath $zipPath
  $hash = Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
  [pscustomobject]@{
    Path = $zip.FullName
    Size = $zip.Length
    Entries = $entryCount
    SHA256 = $hash.Hash
  }
} finally {
  $stagingFull = [IO.Path]::GetFullPath($stagingRoot)
  if (-not $stagingFull.StartsWith($releaseRootFull, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Staging directory escaped the release root"
  }
  if (Test-Path -LiteralPath $stagingFull) {
    Remove-Item -LiteralPath $stagingFull -Recurse -Force
  }
}
