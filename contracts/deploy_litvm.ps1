<#
.SYNOPSIS
    Automated Deployment Script for Balary on LitVM (Chain ID 4441)
.DESCRIPTION
    Deploys the entire smart contract stack for Balary:
    1. Tokens (BAL, USDC, WLTC, SOFT, MONKE)
    2. PoolManager (Uniswap v4 Core)
    3. Permit2
    4. V4Quoter
    5. PositionDescriptor, WETH, and PositionManager
    6. StateView
    7. UniversalRouter
    8. MultiTokenFaucet (and funds it with 1,000,000 of each token)
    9. PointsHook (mined with CREATE2 afterSwap flag)
    
    Automatically synchronizes deployed contract addresses into:
    - mlSwap-contract-main/deployments.txt
    - mlSwap-frontend/src/lib/constants.ts
    - mlSwap-frontend/src/config/tokens.ts
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

# 1. Ensure Foundry binary path is available
$foundryBin = "$env:USERPROFILE\.foundry\bin"
if ($env:PATH -notlike "*$foundryBin*") {
    $env:PATH = "$foundryBin;$env:PATH"
}

Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "           BALARY LITVM DEPLOYMENT ORCHESTRATOR (Chain ID: 4441)         " -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Green

# 2. Set directory and Load .env
$contractDir = $PSScriptRoot
Set-Location $contractDir
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

# 3. Check for PRIVATE_KEY
if (-not $env:PRIVATE_KEY -or $env:PRIVATE_KEY.Trim() -eq "") {
    Write-Host ""
    Write-Host " [!] ERROR: PRIVATE_KEY is not set in contracts\.env" -ForegroundColor Red
    Write-Host " Please open the .env file and set your private key:" -ForegroundColor Yellow
    Write-Host "   PRIVATE_KEY=0xYourPrivateKeyHere" -ForegroundColor White
    Write-Host ""
    Write-Host " Then re-run: .\deploy_litvm.ps1" -ForegroundColor Cyan
    Write-Host "==========================================================================" -ForegroundColor Red
    exit 1
}

if (-not $env:RPC_URL -or $env:RPC_URL.Trim() -eq "") {
    $env:RPC_URL = "https://liteforge.rpc.caldera.xyz/http"
}

# 4. Verify Deployer Wallet
try {
    $deployerAddress = (cast wallet address --private-key $env:PRIVATE_KEY 2>&1).Trim()
    if ($deployerAddress -notmatch "^0x[0-9a-fA-F]{40}$") {
        throw "Invalid address derived: $deployerAddress"
    }
} catch {
    Write-Host " [!] Failed to derive wallet address from PRIVATE_KEY. Please verify key format." -ForegroundColor Red
    exit 1
}

Write-Host " [i] Deployer Wallet Address: $deployerAddress" -ForegroundColor Cyan

if (-not $env:ADDRESS_TO_MINT_TO -or $env:ADDRESS_TO_MINT_TO.Trim() -eq "") {
    $env:ADDRESS_TO_MINT_TO = $deployerAddress
}
Write-Host " [i] Mint & Owner Target Address: $env:ADDRESS_TO_MINT_TO" -ForegroundColor Cyan

# 5. Check zkLTC balance
try {
    $balanceRaw = (cast balance $deployerAddress --rpc-url $env:RPC_URL --ether 2>&1).Trim()
    Write-Host " [i] Wallet Balance on LitVM: $balanceRaw zkLTC" -ForegroundColor Yellow
    $balNum = [double]$balanceRaw
    if ($balNum -lt 0.005) {
        Write-Host " [!] WARNING: Wallet balance is very low ($balanceRaw zkLTC). Deployment might run out of gas." -ForegroundColor Red
    }
} catch {
    Write-Host " [!] Could not fetch wallet balance from RPC: $_" -ForegroundColor DarkYellow
}

# Helper function to run forge script and capture output
function Run-ScriptStep {
    param(
        [string]$ScriptPath,
        [string]$StepTitle
    )
    Write-Host ""
    Write-Host "--------------------------------------------------------------------------" -ForegroundColor Magenta
    Write-Host ">>> $StepTitle" -ForegroundColor Magenta
    Write-Host "Script: $ScriptPath" -ForegroundColor DarkGray
    Write-Host "--------------------------------------------------------------------------" -ForegroundColor Magenta

    $out = & forge script $ScriptPath --rpc-url $env:RPC_URL --private-key $env:PRIVATE_KEY --broadcast -vv 2>&1
    $outStr = ($out | Out-String)
    Write-Host $outStr

    if ($LASTEXITCODE -ne 0) {
        Write-Host " [!] Deployment failed at step: $StepTitle (Exit Code $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    return $outStr
}

function Extract-Address {
    param(
        [string]$Text,
        [string]$Pattern
    )
    if ($Text -match $Pattern) {
        return $Matches[1].Trim()
    }
    return $null
}

# ---------------------------------------------------------------------------
# STEP 1: Deploy Tokens (BAL, USDC, WLTC, SOFT, MONKE)
# ---------------------------------------------------------------------------
$step1Output = Run-ScriptStep "script/DeployTokens.s.sol:DeployTokens" "Step 1: Deploying Balary Tokens (BAL, USDC, WLTC, SOFT, MONKE)"
$BAL = Extract-Address $step1Output 'BAL \(Balary\):\s+(0x[0-9a-fA-F]{40})'
$USDC = Extract-Address $step1Output 'USDC:\s+(0x[0-9a-fA-F]{40})'
$WLTC = Extract-Address $step1Output 'WLTC:\s+(0x[0-9a-fA-F]{40})'
$SOFT = Extract-Address $step1Output 'SOFT:\s+(0x[0-9a-fA-F]{40})'
$MONKE = Extract-Address $step1Output 'MONKE:\s+(0x[0-9a-fA-F]{40})'

if (-not $BAL -or -not $USDC -or -not $WLTC -or -not $SOFT -or -not $MONKE) {
    Write-Host " [!] Could not parse token addresses from Step 1 output." -ForegroundColor Red
    exit 1
}

$env:BAL_ADDRESS = $BAL
$env:USDC_ADDRESS = $USDC
$env:WLTC_ADDRESS = $WLTC
$env:SOFT_ADDRESS = $SOFT
$env:MONKE_ADDRESS = $MONKE

Write-Host " [OK] Tokens Deployed:" -ForegroundColor Green
Write-Host "      BAL:   $BAL"
Write-Host "      USDC:  $USDC"
Write-Host "      WLTC:  $WLTC"
Write-Host "      SOFT:  $SOFT"
Write-Host "      MONKE: $MONKE"

# ---------------------------------------------------------------------------
# STEP 2: Deploy PoolManager
# ---------------------------------------------------------------------------
$step2Output = Run-ScriptStep "script/DeployPM.s.sol:DeployPM" "Step 2: Deploying PoolManager"
$POOLMANAGER = Extract-Address $step2Output 'PoolManager deployed at:\s+(0x[0-9a-fA-F]{40})'
if (-not $POOLMANAGER) {
    $POOLMANAGER = Extract-Address $step2Output 'manager:\s+contract\s+PoolManager\s+(0x[0-9a-fA-F]{40})'
}
if (-not $POOLMANAGER) {
    Write-Host " [!] Could not parse PoolManager address." -ForegroundColor Red
    exit 1
}
$env:POOLMANAGER_ADDRESS = $POOLMANAGER
Write-Host " [OK] PoolManager Deployed: $POOLMANAGER" -ForegroundColor Green

# ---------------------------------------------------------------------------
# STEP 3: Deploy Permit2
# ---------------------------------------------------------------------------
$step3Output = Run-ScriptStep "script/DeployPermit2.s.sol:DeployPermit2" "Step 3: Deploying Permit2"
$PERMIT2 = Extract-Address $step3Output 'Permit2 deployed at:\s+(0x[0-9a-fA-F]{40})'
if (-not $PERMIT2) {
    Write-Host " [!] Could not parse Permit2 address." -ForegroundColor Red
    exit 1
}
$env:PERMIT2_ADDRESS = $PERMIT2
Write-Host " [OK] Permit2 Deployed: $PERMIT2" -ForegroundColor Green

# ---------------------------------------------------------------------------
# STEP 4: Deploy V4Quoter
# ---------------------------------------------------------------------------
$step4Output = Run-ScriptStep "script/DeployQuoter.s.sol:DeployQuoter" "Step 4: Deploying V4Quoter"
$V4_QUOTER = Extract-Address $step4Output 'V4Quoter deployed at:\s+(0x[0-9a-fA-F]{40})'
if (-not $V4_QUOTER) {
    Write-Host " [!] Could not parse V4Quoter address." -ForegroundColor Red
    exit 1
}
$env:V4_QUOTER_ADDRESS = $V4_QUOTER
Write-Host " [OK] V4Quoter Deployed: $V4_QUOTER" -ForegroundColor Green

# ---------------------------------------------------------------------------
# STEP 5: Deploy PositionManager, WETH & PositionDescriptor
# ---------------------------------------------------------------------------
$step5Output = Run-ScriptStep "script/DeployPositionManager.s.sol:DeployPositionManager" "Step 5: Deploying WETH, PositionDescriptor & PositionManager"
$WETH = Extract-Address $step5Output 'WETH deployed at:\s+(0x[0-9a-fA-F]{40})'
$POSITION_DESCRIPTOR = Extract-Address $step5Output 'PositionDescriptor deployed at:\s+(0x[0-9a-fA-F]{40})'
$POSITION_MANAGER = Extract-Address $step5Output 'PositionManager deployed at:\s+(0x[0-9a-fA-F]{40})'

if (-not $WETH -or -not $POSITION_DESCRIPTOR -or -not $POSITION_MANAGER) {
    Write-Host " [!] Could not parse PositionManager components from Step 5." -ForegroundColor Red
    exit 1
}

$env:WETH_ADDRESS = $WETH
$env:POSITION_DESCRIPTOR = $POSITION_DESCRIPTOR
$env:POSITION_MANAGER_ADDRESS = $POSITION_MANAGER

Write-Host " [OK] WETH Deployed:               $WETH" -ForegroundColor Green
Write-Host " [OK] PositionDescriptor Deployed: $POSITION_DESCRIPTOR" -ForegroundColor Green
Write-Host " [OK] PositionManager Deployed:    $POSITION_MANAGER" -ForegroundColor Green

# ---------------------------------------------------------------------------
# STEP 6: Deploy StateView
# ---------------------------------------------------------------------------
$step6Output = Run-ScriptStep "script/DeployStateView.s.sol:DeployStateView" "Step 6: Deploying StateView"
$STATEVIEW = Extract-Address $step6Output 'StateView deployed at:\s+(0x[0-9a-fA-F]{40})'
if (-not $STATEVIEW) {
    Write-Host " [!] Could not parse StateView address." -ForegroundColor Red
    exit 1
}
$env:STATEVIEW_ADDRESS = $STATEVIEW
Write-Host " [OK] StateView Deployed: $STATEVIEW" -ForegroundColor Green

# ---------------------------------------------------------------------------
# STEP 7: Deploy UniversalRouter
# ---------------------------------------------------------------------------
$step7Output = Run-ScriptStep "script/DeployUniversalRouter.s.sol:DeployUniversalRouter" "Step 7: Deploying UniversalRouter"
$UNIVERSALROUTER = Extract-Address $step7Output 'UniversalRouter deployed at:\s+(0x[0-9a-fA-F]{40})'
if (-not $UNIVERSALROUTER) {
    Write-Host " [!] Could not parse UniversalRouter address." -ForegroundColor Red
    exit 1
}
$env:UNIVERSALROUTER_ADDRESS = $UNIVERSALROUTER
Write-Host " [OK] UniversalRouter Deployed: $UNIVERSALROUTER" -ForegroundColor Green

# ---------------------------------------------------------------------------
# STEP 8: Deploy & Fund MultiTokenFaucet
# ---------------------------------------------------------------------------
$step8Output = Run-ScriptStep "script/DeployMultiTokenFaucet.sol:DeployFaucet" "Step 8: Deploying & Funding MultiTokenFaucet"
$FAUCET = Extract-Address $step8Output 'MultiTokenFaucet deployed at:\s+(0x[0-9a-fA-F]{40})'
if (-not $FAUCET) {
    Write-Host " [!] Could not parse MultiTokenFaucet address." -ForegroundColor Red
    exit 1
}
$env:FAUCET_ADDRESS = $FAUCET
Write-Host " [OK] MultiTokenFaucet Deployed & Funded: $FAUCET" -ForegroundColor Green

# ---------------------------------------------------------------------------
# STEP 9: Mine & Deploy PointsHook
# ---------------------------------------------------------------------------
$step9Output = Run-ScriptStep "script/DeployPointsHook.s.sol:DeployPointsHook" "Step 9: Mining CREATE2 Salt & Deploying PointsHook"
$POINTSHOOK = Extract-Address $step9Output 'PointsHook deployed at:\s+(0x[0-9a-fA-F]{40})'
if (-not $POINTSHOOK) {
    Write-Host " [!] Could not parse PointsHook address." -ForegroundColor Red
    exit 1
}
$env:POINTSHOOK_ADDRESS = $POINTSHOOK
Write-Host " [OK] PointsHook Deployed: $POINTSHOOK" -ForegroundColor Green

# ---------------------------------------------------------------------------
# STEP 10: Persist Deployments & Sync Frontend
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "--------------------------------------------------------------------------" -ForegroundColor Yellow
Write-Host ">>> Synchronizing Deployed Addresses Across Project" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------------------------" -ForegroundColor Yellow

# Write deployments.txt
$deploymentsTxt = @"
ADDRESS_TO_MINT_TO=$env:ADDRESS_TO_MINT_TO

BAL_ADDRESS=$BAL
USDC_ADDRESS=$USDC
WLTC_ADDRESS=$WLTC
SOFT_ADDRESS=$SOFT
MONKE_ADDRESS=$MONKE

POOLMANAGER_ADDRESS=$POOLMANAGER
V4_QUOTER_ADDRESS=$V4_QUOTER
PERMIT2_ADDRESS=$PERMIT2
POSITION_DESCRIPTOR=$POSITION_DESCRIPTOR
WETH_ADDRESS=$WETH
POSITION_MANAGER_ADDRESS=$POSITION_MANAGER

STATEVIEW_ADDRESS=$STATEVIEW
UNIVERSALROUTER_ADDRESS=$UNIVERSALROUTER
FAUCET_ADDRESS=$FAUCET
POINTSHOOK_ADDRESS=$POINTSHOOK
"@
Set-Content -Path (Join-Path $contractDir "deployments.txt") -Value $deploymentsTxt
Write-Host " [OK] Written: contracts/deployments.txt" -ForegroundColor Green

# Sync frontend constants.ts
$targetFrontend = if (Test-Path (Join-Path $contractDir "..\frontend")) { "..\frontend" } else { "..\mlSwap-frontend" }
$frontendConstantsPath = Join-Path $contractDir "$targetFrontend\src\lib\constants.ts"
$constantsContent = @"
export const USDC_ADDRESS = "$USDC";

export const POOLMANAGER_ADDRESS = "$POOLMANAGER";
export const V4_QUOTER_ADDRESS = "$V4_QUOTER";
export const PERMIT2_ADDRESS = "$PERMIT2";
export const WETH_ADDRESS = "$WETH";
export const POSITION_MANAGER_ADDRESS = "$POSITION_MANAGER";
export const STATEVIEW_ADDRESS = "$STATEVIEW";
export const UNIVERSALROUTER_ADDRESS = "$UNIVERSALROUTER";

export const FAUCET_ADDRESS = "$FAUCET";
export const POINTSHOOK_ADDRESS = "$POINTSHOOK";

export const ACTIONS = {
  // --- Liquidity Actions (PositionManager) ---
  INCREASE_LIQUIDITY: 0x00,              // 0
  DECREASE_LIQUIDITY: 0x01,              // 1
  MINT_POSITION: 0x02,                   // 2
  BURN_POSITION: 0x03,                   // 3
  INCREASE_LIQUIDITY_FROM_DELTAS: 0x04,  // 4
  MINT_POSITION_FROM_DELTAS: 0x05,       // 5

  // --- Swap Actions (Router) ---
  SWAP_EXACT_IN_SINGLE: 0x06,            // 6
  SWAP_EXACT_IN: 0x07,                   // 7
  SWAP_EXACT_OUT_SINGLE: 0x08,           // 8
  SWAP_EXACT_OUT: 0x09,                  // 9

  // --- Utility & Payments ---
  DONATE: 0x0a,                          // 10
  SETTLE: 0x0b,                          // 11
  SETTLE_ALL: 0x0c,                      // 12
  SETTLE_PAIR: 0x0d,                     // 13
  TAKE: 0x0e,                            // 14
  TAKE_ALL: 0x0f,                        // 15
  TAKE_PORTION: 0x10,                    // 16
  TAKE_PAIR: 0x11,                       // 17
  CLOSE_CURRENCY: 0x12,                  // 18
  CLEAR_OR_TAKE: 0x13,                   // 19
  SWEEP: 0x14,                           // 20
  WRAP: 0x15,                            // 21
  UNWRAP: 0x16,                          // 22

  // --- ERC-6909 Actions ---
  MINT_6909: 0x17,                       // 23
  BURN_6909: 0x18                        // 24
} as const;
"@
Set-Content -Path $frontendConstantsPath -Value $constantsContent
Write-Host " [OK] Written: $targetFrontend/src/lib/constants.ts" -ForegroundColor Green

# Sync frontend tokens.ts
$frontendTokensPath = Join-Path $contractDir "$targetFrontend\src\config\tokens.ts"
$tokensContent = @"
export interface TokenConfig {
  address: ``0x`${string}``;
  name: string;
  symbol: string;
  decimals: number;
  logo: string;
}

export const TOKENS: TokenConfig[] = [
  {
    address: "$BAL",
    name: "Balary",
    symbol: "BAL",
    decimals: 18,
    logo: "/tokens/bal.svg"
  },
  {
    address: "$USDC",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    logo: "/assets/0x3600000000000000000000000000000000000000/logo.png"
  },
  {
    address: "$WLTC",
    name: "Wrapped Litecoin",
    symbol: "WLTC",
    decimals: 18,
    logo: "/tokens/wltc.svg"
  },
  {
    address: "$SOFT",
    name: "SoftDAO",
    symbol: "SOFT",
    decimals: 18,
    logo: "/assets/0x8c277c071D42987Ef7712d135C4da1f46EA8Af8d/logo.png"
  },
  {
    address: "$MONKE",
    name: "MONKE",
    symbol: "MONKE",
    decimals: 18,
    logo: "/assets/0x57700E377d85328322574FB8d92d4F017a2106E2/logo.jpeg"
  }
];
"@
Set-Content -Path $frontendTokensPath -Value $tokensContent
Write-Host " [OK] Written: $targetFrontend/src/config/tokens.ts" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "           BALARY DEPLOYMENT COMPLETED SUCCESSFULLY ON LITVM!             " -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host " Balary Tokens:" -ForegroundColor White
Write-Host "   BAL:                 $BAL"
Write-Host "   USDC:                $USDC"
Write-Host "   WLTC:                $WLTC"
Write-Host "   SOFT:                $SOFT"
Write-Host "   MONKE:               $MONKE"
Write-Host " Core Infrastructure:" -ForegroundColor White
Write-Host "   PoolManager:         $POOLMANAGER"
Write-Host "   Permit2:             $PERMIT2"
Write-Host "   V4Quoter:            $V4_QUOTER"
Write-Host "   PositionManager:     $POSITION_MANAGER"
Write-Host "   StateView:           $STATEVIEW"
Write-Host "   UniversalRouter:     $UNIVERSALROUTER"
Write-Host "   MultiTokenFaucet:    $FAUCET"
Write-Host "   PointsHook:          $POINTSHOOK"
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host " You can now start the Balary frontend ('npm run dev') and create pools!" -ForegroundColor Cyan
