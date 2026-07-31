param(
    [string]$OutputPath = "artifacts/philsla-backend-staging.zip",
    [switch]$SkipCollectStatic
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repoRoot "backend"
$resolvedOutputPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath
} else {
    Join-Path $repoRoot $OutputPath
}

if (-not $SkipCollectStatic) {
    $requiredEnvironment = @(
        "DJANGO_SECRET_KEY",
        "DJANGO_ALLOWED_HOSTS",
        "DJANGO_CSRF_TRUSTED_ORIGINS",
        "DJANGO_CORS_ALLOWED_ORIGINS",
        "DATABASE_URL",
        "ACTIVE_EXAM_CYCLE_ID"
    )

    $missingEnvironment = @($requiredEnvironment | Where-Object {
        [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_))
    })

    if ($missingEnvironment.Count -gt 0) {
        throw "Missing required staging environment variables for collectstatic: $($missingEnvironment -join ', ')"
    }

    Push-Location $backendRoot
    try {
        $python = Join-Path $backendRoot ".venv/Scripts/python.exe"
        if (-not (Test-Path -LiteralPath $python)) {
            $python = "python"
        }

        & $python manage.py collectstatic --noinput --settings=config.settings.staging
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

$archiveRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("philsla-zipdeploy-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $archiveRoot | Out-Null

try {
    $excludedDirectories = @(
        (Join-Path $repoRoot ".git"),
        (Join-Path $repoRoot "artifacts"),
        (Join-Path $repoRoot "backend/.venv"),
        (Join-Path $repoRoot "backend/venv"),
        (Join-Path $repoRoot "backend/private-media"),
        (Join-Path $repoRoot "backend/__pycache__"),
        (Join-Path $repoRoot "frontend/node_modules"),
        (Join-Path $repoRoot "frontend/dist"),
        (Join-Path $repoRoot "frontend/test-results"),
        (Join-Path $repoRoot "frontend/playwright-report"),
        (Join-Path $repoRoot "frontend/coverage"),
        "__pycache__"
    )

    $excludedFiles = @(".env", ".env.local", "db.sqlite3", "*.pyc", "*.pyo")

    $robocopyArguments = @(
        $repoRoot,
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

Write-Host "Created ZIP deploy package: $resolvedOutputPath"
