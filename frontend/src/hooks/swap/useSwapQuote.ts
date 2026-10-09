import { useRef, useState, useCallback } from 'react';
import { parseUnits, formatUnits } from 'ethers';
import { usePublicClient } from 'wagmi';
import V4QuoterABI from '@/abi/V4Quoter.json';
import { V4_QUOTER_ADDRESS } from '@/lib/constants';
import type { TokenConfig } from '@/config/tokens';

import { sqrtRatioX96ToPrice } from '@/utils/liquidityMath/fullMath';

export interface UseSwapQuoteParams {
  token0: TokenConfig;
  token1: TokenConfig;
  poolFee: number;          // raw basis points: 100, 500, 3000, 10000
  tickSpacing: number;
  hooksAddress: string;
  sqrtPriceX96: string;     // raw sqrtPriceX96 string from the pool
}

export function useSwapQuote({
  token0,
  token1,
  poolFee,
  tickSpacing,
  hooksAddress,
  sqrtPriceX96,
}: UseSwapQuoteParams) {
  const publicClient = usePublicClient();

  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [gas, setGas] = useState<bigint | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastChanged = useRef<'input' | 'output' | null>(null);

  // Determine sorted currency order
  const zeroForOne =
    token0.address.toLowerCase() < token1.address.toLowerCase();

  const [currency0, currency1, dec0, dec1] = zeroForOne
    ? [token0.address, token1.address, token0.decimals, token1.decimals]
    : [token1.address, token0.address, token1.decimals, token0.decimals];

  const poolKey = {
    currency0,
    currency1,
    fee: poolFee,
    tickSpacing,
    hooks: (hooksAddress ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
  };

  function formatQuoteAmount(val: bigint, decimals: number): string {
    const formatted = formatUnits(val, decimals);
    const num = Number(formatted);
    if (isNaN(num) || num === 0) return '0';
    if (num < 0.0001) {
      return parseFloat(num.toFixed(8)).toString();
    }
    if (num < 1) {
      return parseFloat(num.toFixed(6)).toString();
    }
    return parseFloat(num.toFixed(4)).toString();
  }

  function formatEstimateAmount(num: number): string {
    if (isNaN(num) || num <= 0) return '0';
    if (num < 0.0001) {
      return parseFloat(num.toFixed(8)).toString();
    }
    if (num < 1) {
      return parseFloat(num.toFixed(6)).toString();
    }
    return parseFloat(num.toFixed(4)).toString();
  }

  function sanitize(val: string): string | null {
    const clean = val.replace(/[^0-9.]/g, '');
    return clean && !isNaN(Number(clean)) ? clean : null;
  }

  const onInputChange = useCallback(
    (val: string) => {
      lastChanged.current = 'input';
      setInputAmount(val);
      setError(null);

      const clean = sanitize(val);
      if (!clean || Number(clean) === 0) {
        setOutputAmount('');
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        return;
      }

      // Instant estimate using integer sqrtPrice math
      try {
        if (sqrtPriceX96 && sqrtPriceX96 !== '0') {
          const [price0, price1] = sqrtRatioX96ToPrice(sqrtPriceX96, dec0, dec1);
          const activePrice = zeroForOne ? price0 : price1;
          const estimated = Number(clean) * activePrice;
          setOutputAmount(formatEstimateAmount(estimated));
        }
      } catch {
        // ignore estimation errors, quoter will correct
      }

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        if (lastChanged.current !== 'input') return;
        if (!publicClient) return;
        try {
          setIsLoading(true);
          const inputDecimals = zeroForOne ? dec0 : dec1;
          const outputDecimals = zeroForOne ? dec1 : dec0;

          const result = await publicClient.readContract({
            address: V4_QUOTER_ADDRESS as `0x${string}`,
            abi: V4QuoterABI.abi,
            functionName: 'quoteExactInputSingle',
            args: [
              {
                poolKey,
                zeroForOne,
                exactAmount: parseUnits(clean, inputDecimals),
                hookData: '0x',
              },
            ],
          });
          console.log(" quote poolkey: ", poolKey)

          const [amountOut, gasUsed] = result as [bigint, bigint];
          console.log({amountOut, gasUsed})
          setGas(gasUsed); 
          // setGas should be from simulation
          setOutputAmount(formatQuoteAmount(amountOut, outputDecimals));
          setError(null);
        } catch (e) {
          console.warn('quoteExactInputSingle failed:', e);
          setError('Insufficient liquidity');
        } finally {
          setIsLoading(false);
        }
      }, 300);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sqrtPriceX96, publicClient, dec0, dec1, zeroForOne, poolFee, tickSpacing, hooksAddress, currency0, currency1]
  );

  const onOutputChange = useCallback(
    (val: string) => {
      lastChanged.current = 'output';
      setOutputAmount(val);
      setError(null);

      const clean = sanitize(val);
      if (!clean || Number(clean) === 0) {
        setInputAmount('');
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        return;
      }

      // Instant estimate (reverse)
      try {
        if (sqrtPriceX96 && sqrtPriceX96 !== '0') {
          const [price0, price1] = sqrtRatioX96ToPrice(sqrtPriceX96, dec0, dec1);
          const activePrice = zeroForOne ? price0 : price1;
          if (activePrice > 0) {
            const estimated = Number(clean) / activePrice;
            setInputAmount(formatEstimateAmount(estimated));
          }
        }
      } catch { 
        // ignore estimation errors
      }

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        if (lastChanged.current !== 'output') return;
        if (!publicClient) return;
        try {
          setIsLoading(true);
          const inputDecimals = zeroForOne ? dec0 : dec1;
          const outputDecimals = zeroForOne ? dec1 : dec0;

          const result = await publicClient.readContract({
            address: V4_QUOTER_ADDRESS as `0x${string}`,
            abi: V4QuoterABI.abi,
            functionName: 'quoteExactOutputSingle',
            args: [
              {
                poolKey,
                zeroForOne,
                exactAmount: parseUnits(clean, outputDecimals),
                hookData: '0x',
              },
            ],
          });
          console.log(" quote poolkey: ", poolKey)
          const [amountIn, gasUsed] = result as [bigint, bigint];
          console.log({amountIn, gasUsed})
          setGas(gasUsed);
          setInputAmount(formatQuoteAmount(amountIn, inputDecimals));
          setError(null);
        } catch (e) {
          console.warn('quoteExactOutputSingle failed:', e);
          setError('Insufficient liquidity');
        } finally {
          setIsLoading(false);
        }
      }, 300);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sqrtPriceX96, publicClient, dec0, dec1, zeroForOne, poolFee, tickSpacing, hooksAddress, currency0, currency1]
  );

  const inputAmountRef = useRef(inputAmount);
  const outputAmountRef = useRef(outputAmount);
  inputAmountRef.current = inputAmount;
  outputAmountRef.current = outputAmount;

  const onInputChangeRef = useRef(onInputChange);
  const onOutputChangeRef = useRef(onOutputChange);
  onInputChangeRef.current = onInputChange;
  onOutputChangeRef.current = onOutputChange;

  // Stable identity — safe to put in effect deps without re-firing on every quote update
  const retriggerQuote = useCallback(() => {
    if (lastChanged.current === 'input' && inputAmountRef.current) {
      onInputChangeRef.current(inputAmountRef.current);
    } else if (lastChanged.current === 'output' && outputAmountRef.current) {
      onOutputChangeRef.current(outputAmountRef.current);
    } else if (inputAmountRef.current) {
      onInputChangeRef.current(inputAmountRef.current);
    }
  }, []);

  return {
    inputAmount,
    outputAmount,
    isLoading,
    error,
    gas,
    onInputChange,
    onOutputChange,
    setInputAmount,
    setOutputAmount,
    setGas,
    retriggerQuote,
  };
}
