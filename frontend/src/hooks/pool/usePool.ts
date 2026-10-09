import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { zeroAddress } from 'viem'
import type { ToastType } from '@/components/Toast';
import { TOKENS } from '@/config/tokens';
import POOL_MANAGER_ABI from '../../abi/PoolManager.json';
import { redis } from '@/lib/redis';
import { POOLMANAGER_ADDRESS, STATEVIEW_ADDRESS, API_BASE_URL } from '@/lib/constants';

import { priceToSqrtPriceX96, sqrtPriceX96ToTick } from '@/utils/liquidityMath/liquidityAmounts';

export interface Token {
  address: string
  symbol: string
  decimals: number
  name: string
  logo: string
}

export interface InitializePoolParams {
  tokenA: Token
  tokenB: Token
  fee: number
  tickSpacing: number
  hooks?: `0x${string}`
  priceRatioA: string 
  priceRatioB: string
}

interface ToastState {
  show: boolean
  type: ToastType
  title: string
  message: string
  txHash?: string
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * sqrtPriceX96 = floor(sqrt(A / B) * 2 ** 96)
 */

////////////////////// OLD ///////////////


// function isqrt(n: bigint): bigint {
//   if (n < 0n) throw new Error("Square root of negative number")
//   if (n === 0n) return 0n
//   if (n === 1n) return 1n

//   let x = n
//   let y = (x + 1n) >> 1n

//   while (y < x) {
//     x = y
//     y = (x + n / x) >> 1n
//   }

//   return x
// }
// export function calculateSqrtPriceX96(amount1: bigint, amount0: bigint): bigint {
//   if (amount0 === 0n) throw new Error("amount0 cannot be zero")
//   if (amount1 === 0n) throw new Error("amount1 cannot be zero")

//   const numerator = amount1 << 192n   // amount1 * 2^192
//   const ratio     = numerator / amount0
//   return isqrt(ratio)
// }

// const sqrtPriceX96 = calculateSqrtPriceX96(
//         BigInt(priceRatio1) * 10n ** BigInt(token1.decimals),  // token1 raw
//         BigInt(priceRatio0) * 10n ** BigInt(token0.decimals)   // token0 raw
//       );




/////////////////////////////////


function isqrt(n: bigint): bigint {
  if (n < 0n) throw new Error("Square root of negative number")
  if (n === 0n) return 0n
  if (n === 1n) return 1n

  let x = n
  let y = (x + 1n) >> 1n

  while (y < x) {
    x = y
    y = (x + n / x) >> 1n
  }

  return x
}
export function calculateSqrtPriceX96(amount1: bigint, amount0: bigint): bigint {
  if (amount0 === 0n) throw new Error("amount0 cannot be zero")
  if (amount1 === 0n) throw new Error("amount1 cannot be zero")

  const numerator = amount1 << 192n   // amount1 * 2^192
  const ratio     = numerator / amount0
  return isqrt(ratio)
}

/**
 * if (tokenA > tokenB) { (token0, token1) = (tokenB, tokenA) }
 */
function sortTokens(tokenA: Token, tokenB: Token): [Token, Token] {
  return tokenA.address.toLowerCase() > tokenB.address.toLowerCase()
    ? [tokenB, tokenA]
    : [tokenA, tokenB]
}


// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePool() {
  const navigate = useNavigate()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [toast, setToast] = useState<ToastState>({
    show:    false,
    type:    'pending',
    title:   '',
    message: '',
    txHash:  undefined,
  })

  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [isInitializing, setIsInitializing] = useState(false)

  const { isLoading: isConfirmingTx } = useWaitForTransactionReceipt({ hash: txHash })
  const isConfirming = isConfirmingTx || isInitializing

  // ── Toast helpers ─────────────────────────────────────────────────────────

  function showToast(
    type: ToastType,
    title: string,
    message: string,
    txHash?: string
  ) {
    setToast({ show: true, type, title, message, txHash })
  }

  function dismissToast() {
    setToast(prev => ({ ...prev, show: false }))
  }


  // ── Main function ─────────────────────────────────────────────────────────

  async function initializePool({
    tokenA,
    tokenB,
    fee,
    tickSpacing,
    hooks,
    priceRatioA,
    priceRatioB,
  }: InitializePoolParams) {
 
    console.log({
      tokenA,
      tokenB,
      fee,
      tickSpacing,
      hooks,
      priceRatioA,
      priceRatioB,
    });

    // 1. Validate tokens are in our token list
    const tokenAInList = TOKENS.find(
      t => t.address.toLowerCase() === tokenA.address.toLowerCase()
    )
    const tokenBInList = TOKENS.find(
      t => t.address.toLowerCase() === tokenB.address.toLowerCase()
    )

    if (!tokenAInList) {
      showToast('error', 'Invalid Token', `${tokenA.symbol} is not in the supported token list.`)
      return
    }

    if (!tokenBInList) {
      showToast('error', 'Invalid Token', `${tokenB.symbol} is not in the supported token list.`)
      return
    }

    if (tokenA.address.toLowerCase() === tokenB.address.toLowerCase()) {
      showToast('error', 'Invalid Pair', 'Cannot create a pool with the same token on both sides.')
      return
    }

    // Sort tokens
    const [token0, token1] = sortTokens(tokenA, tokenB);
    const swapped = token0.address.toLowerCase() !== tokenA.address.toLowerCase();

    // Assign price ratios to match sorted order
    const priceRatio0 = swapped ? priceRatioB : priceRatioA;  // ratio for token0
    const priceRatio1 = swapped ? priceRatioA : priceRatioB;  // ratio for token1

    // Calculate sqrtPriceX96 with correct sorted ratios + decimals
    const sqrtPriceX96 = calculateSqrtPriceX96(
      BigInt(priceRatio1) * 10n ** BigInt(token1.decimals),  // token1 raw
      BigInt(priceRatio0) * 10n ** BigInt(token0.decimals)   // token0 raw
    );

    // Build pool key
    const poolKey = {
      currency0:   token0.address as `0x${string}`,
      currency1:   token1.address as `0x${string}`,
      fee,
      tickSpacing,
      hooks: (hooks || zeroAddress) as `0x${string}`,
    };

    try {
      setIsInitializing(true);

      // Log all params before contract call
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🏊 Initializing Pool — Params')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('PoolManager address :', POOLMANAGER_ADDRESS);

      console.log('Token0 (currency0) (decimals):', token0.symbol, token0.address, token0.decimals)
      console.log('Token1 (currency1) (decimals):', token1.symbol, token1.address, token1.decimals)
      console.log('Fee                :', fee, `(${fee / 10000}%)`)
      console.log('TickSpacing        :', tickSpacing)
      console.log('Hooks              :', hooks)
      console.log('Price Ratio        :', `${priceRatio0}:${priceRatio1}`)
      console.log('sqrtPriceX96       :', sqrtPriceX96.toString())
      console.log('Full Pool Key      :', poolKey)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // Check if pool is already initialized on-chain before sending tx
      const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24", "int24", "address"],
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
      );
      const computedPoolId = ethers.keccak256(encoded) as `0x${string}`;

      if (publicClient) {
        try {
          const slot0 = await publicClient.readContract({
            address: STATEVIEW_ADDRESS as `0x${string}`,
            abi: [
              {
                name: 'getSlot0',
                type: 'function',
                stateMutability: 'view',
                inputs: [{ name: 'poolId', type: 'bytes32' }],
                outputs: [
                  { name: 'sqrtPriceX96', type: 'uint160' },
                  { name: 'tick', type: 'int24' },
                  { name: 'protocolFee', type: 'uint24' },
                  { name: 'lpFee', type: 'uint24' }
                ]
              }
            ],
            functionName: 'getSlot0',
            args: [computedPoolId],
          }) as [bigint, number, number, number];

          if (slot0 && slot0[0] > 0n) {
            console.log("Pool already initialized with sqrtPriceX96:", slot0[0].toString());
            showToast(
              'success',
              'Pool Already Exists',
              `${token0.symbol}/${token1.symbol} pool has already been initialized! Redirecting to add liquidity...`
            );
            setIsInitializing(false);
            const getCurrencyParam = (addr: string) =>
              (addr === '0' || addr === '0x0000000000000000000000000000000000000000') ? 'NATIVE' : addr;
            navigate(`/positions/create/currency0=${getCurrencyParam(poolKey.currency0)}&currency1=${getCurrencyParam(poolKey.currency1)}&fee=${poolKey.fee}&tickSpacing=${poolKey.tickSpacing}&hooks=${poolKey.hooks}&poolId=${computedPoolId}&sqrtPrice=${slot0[0].toString()}`);
            return;
          }
        } catch (checkErr) {
          console.log("Pool not yet initialized, proceeding with initialize...");
        }
      }

      // Pending toast
      showToast(
        'pending',
        'Transaction Pending',
        `Initializing ${token0.symbol}/${token1.symbol} pool at ${priceRatio0}:${priceRatio1} ratio...`
      )

      // Call PoolManager.initialize
      console.log({
        poolKey, sqrtPriceX96
      });
      
      const hash = await writeContractAsync({
        address: POOLMANAGER_ADDRESS as `0x${string}`,
        abi: POOL_MANAGER_ABI.abi,
        functionName: 'initialize',
        args: [poolKey, sqrtPriceX96],
      })

      setTxHash(hash)

      showToast(
        'pending',
        'Transaction Submitted',
        `Initializing ${token0.symbol}/${token1.symbol} pool on-chain...`,
        hash
      )

      if (!publicClient) throw new Error("Public client not available");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'reverted') {
        throw new Error('Transaction reverted on-chain');
      }

      showToast(
        'success',
        'Pool Initialized!',
        `${token0.symbol}/${token1.symbol} pool created successfully. Redirecting to add liquidity...`,
        hash
      );

      // Persist newly initialized pool locally and to backend indexer
      try {
        const storedPools = JSON.parse(localStorage.getItem('mlswap:pools') || '[]');
        const newPoolObj = {
          id: computedPoolId,
          token0: {
            id: token0.address,
            symbol: token0.symbol,
            name: token0.name,
            decimals: token0.decimals,
            derivedUSDC: String(token0.symbol === 'USDC' ? 1 : 0.1)
          },
          token1: {
            id: token1.address,
            symbol: token1.symbol,
            name: token1.name,
            decimals: token1.decimals,
            derivedUSDC: String(token1.symbol === 'USDC' ? 1 : 0.1)
          },
          feeTier: String(poolKey.fee),
          tickSpacing: String(poolKey.tickSpacing),
          hooks: poolKey.hooks,
          liquidity: '0',
          sqrtPrice: sqrtPriceX96.toString(),
          token0Price: String(priceRatio1 !== '0' ? Number(priceRatio0) / Number(priceRatio1) : '1'),
          token1Price: String(priceRatio0 !== '0' ? Number(priceRatio1) / Number(priceRatio0) : '1'),
          tick: '0',
          volumeUSD: '0.00',
          feesUSD: '0.00',
          txCount: '0',
          totalValueLockedUSD: '0.00'
        };
        if (!storedPools.some((p: any) => (p.id || '').toLowerCase() === computedPoolId.toLowerCase())) {
          storedPools.push(newPoolObj);
          localStorage.setItem('mlswap:pools', JSON.stringify(storedPools));
        }

        fetch(`${API_BASE_URL}/api/pools`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: computedPoolId,
            currency0: poolKey.currency0,
            currency1: poolKey.currency1,
            fee: poolKey.fee,
            tickSpacing: poolKey.tickSpacing,
            hooks: poolKey.hooks,
            sqrtPrice: sqrtPriceX96.toString()
          })
        }).catch(err => console.warn('Failed to post pool to indexer:', err));
      } catch (err) {
        console.warn('Error saving local pool:', err);
      }

      try {
        await redis.del("mlswap:pools");
        console.log("Invalidated pools cache");
      } catch (e) {
        console.error("Failed to invalidate cache", e);
      }

      setIsInitializing(false);

      const getCurrencyParam = (addr: string) =>
        (addr === '0' || addr === '0x0000000000000000000000000000000000000000') ? 'NATIVE' : addr;
      navigate(`/positions/create/currency0=${getCurrencyParam(poolKey.currency0)}&currency1=${getCurrencyParam(poolKey.currency1)}&fee=${poolKey.fee}&tickSpacing=${poolKey.tickSpacing}&hooks=${poolKey.hooks}&poolId=${computedPoolId}&sqrtPrice=${sqrtPriceX96.toString()}`);

      return hash;

    } catch (err: any) {
      console.error('Pool initialization failed:', err)
      setIsInitializing(false)
      setTxHash(undefined)

      const errString = `${err?.message || ''} ${err?.data || ''} ${err?.shortMessage || ''}`;
      if (errString.includes('0x7983c051') || errString.includes('PoolAlreadyInitialized')) {
        showToast(
          'success',
          'Pool Already Initialized',
          `${token0.symbol}/${token1.symbol} pool is already initialized. Redirecting to add liquidity...`
        );
        const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "address", "uint24", "int24", "address"],
          [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
        );
        const computedPoolId = ethers.keccak256(encoded);
        const getCurrencyParam = (addr: string) =>
          (addr === '0' || addr === '0x0000000000000000000000000000000000000000') ? 'NATIVE' : addr;
        navigate(`/positions/create/currency0=${getCurrencyParam(poolKey.currency0)}&currency1=${getCurrencyParam(poolKey.currency1)}&fee=${poolKey.fee}&tickSpacing=${poolKey.tickSpacing}&hooks=${poolKey.hooks}&poolId=${computedPoolId}&sqrtPrice=${sqrtPriceX96.toString()}`);
        return;
      }

      showToast(
        'error',
        'Transaction Failed',
        err?.shortMessage ?? err?.message ?? 'Pool initialization failed. Please try again.'
      )
    }
  }

  return {
    initializePool,
    isConfirming,
    toast,
    dismissToast,
  }
}