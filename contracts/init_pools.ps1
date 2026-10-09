[CmdletBinding()]
param(
    [switch]$Broadcast
)

$ErrorActionPreference = "Stop"
$foundryBin = "$env:USERPROFILE\.foundry\bin"
if ($env:PATH -notlike "*$foundryBin*") {
    $env:PATH = "$foundryBin;$env:PATH"
}

$contractDir = $PSScriptRoot
Set-Location $contractDir

# Load .env
$envFile = Join-Path $contractDir ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim().Trim('"').Trim("'")
            [System.Environment]::SetEnvironmentVariable($k, $v, [System.EnvironmentVariableTarget]::Process)
        }
    }
}

# Load deployments.txt
$depFile = Join-Path $contractDir "deployments.txt"
if (Test-Path $depFile) {
    Get-Content $depFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim().Trim('"').Trim("'")
            [System.Environment]::SetEnvironmentVariable($k, $v, [System.EnvironmentVariableTarget]::Process)
        }
    }
}

Write-Host "PoolManager: $env:POOLMANAGER_ADDRESS" -ForegroundColor Cyan
Write-Host "PointsHook:  $env:POINTSHOOK_ADDRESS" -ForegroundColor Cyan

if ($Broadcast) {
    Write-Host "Broadcasting 5 pool initializations on LitVM..." -ForegroundColor Green
    & forge script script/Init5Pools.s.sol:Init5Pools --rpc-url $env:RPC_URL --private-key $env:PRIVATE_KEY --broadcast -vv
} else {
    Write-Host "Dry run simulation of 5 pool initializations..." -ForegroundColor Yellow
    & forge script script/Init5Pools.s.sol:Init5Pools --rpc-url $env:RPC_URL -vv
}
