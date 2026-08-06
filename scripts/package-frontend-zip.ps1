param(
    [string]$OutputPath = "artifacts/philsla-frontend-staging.zip",
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $repoRoot "frontend"
$resolvedOutputPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath
} else {
    Join-Path $repoRoot $OutputPath
}

if (-not $SkipBuild) {
    $requiredEnvironment = @(
        "VITE_AUTH_SERVICE_MODE",
        "VITE_BACKEND_API_BASE_URL"
    )

    $missingEnvironment = @($requiredEnvironment | Where-Object {
        [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_))
    })

    if ($missingEnvironment.Count -gt 0) {
        throw "Missing required staging frontend build environment variables: $($missingEnvironment -join ', ')"
    }

    Push-Location $frontendRoot
    try {
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) {
            throw "npm run build failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}

$outputDirectory = Split-Path -Parent $resolvedOutputPath
if ($outputDirectory) {
    New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
}

if (Test-Path -LiteralPath $resolvedOutputPath) {
    Remove-Item -LiteralPath $resolvedOutputPath
}

$archiveRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("philsla-frontend-zipdeploy-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $archiveRoot | Out-Null

try {
    $excludedDirectories = @(
        (Join-Path $frontendRoot "node_modules"),
        (Join-Path $frontendRoot "test-results"),
        (Join-Path $frontendRoot "playwright-report"),
        (Join-Path $frontendRoot "coverage")
    )

    $excludedFiles = @(".env", ".env.local", "*.log")

    $robocopyArguments = @(
        $frontendRoot,
        $archiveRoot,
        "/E",
        "/NFL",
        "/NDL",
        "/NJH",
        "/NJS",
        "/NC",
        "/NS",
        "/XD"
    ) + $excludedDirectories + @("/XF") + $excludedFiles

    & robocopy @robocopyArguments | Out-Null
    if ($LASTEXITCODE -gt 7) {
        throw "robocopy failed with exit code $LASTEXITCODE"
    }

    Compress-Archive -Path (Join-Path $archiveRoot "*") -DestinationPath $resolvedOutputPath -Force
}
finally {
    if (Test-Path -LiteralPath $archiveRoot) {
        Remove-Item -LiteralPath $archiveRoot -Recurse -Force
    }
}

Write-Host "Created frontend ZIP deploy package: $resolvedOutputPath"
