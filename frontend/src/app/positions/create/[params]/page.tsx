// import { useState, useEffect } from 'react';
// import { Link, useParams } from 'react-router-dom';
// import { ArrowLeft, Copy, Check, Info, Minus, Plus, Infinity } from 'lucide-react';
// import TokenSelector, { Token } from '@/components/TokenSelector';
// import { TOKENS } from '@/config/tokens';
// import { useModifyLiquidity } from '@/hooks/liquidity/useModifyLiquidity';
// import { useSwapQuote } from '@/hooks/swap/useSwapQuote';
// import { sqrtRatioX96ToPrice } from '@/utils/liquidityMath/fullMath';
// import { fetchSubgraph, GET_POOL_BY_ID } from '@/lib/queries';
// import { parseUnits } from 'viem';
// import Toast from '@/components/Toast';
// import { useAccount } from 'wagmi';
// import { useAppKit } from '@reown/appkit/react';
// import { useTokenBalance } from '@/hooks/shared/useTokenBalance';
// import { formatPrice } from '@/utils';

// export default function CreatePositionPage() {
//   const { params } = useParams();
//   const { MIN_TICK, MAX_TICK, priceToTick, mintPosition, toast, dismissToast, isConfirming } = useModifyLiquidity();

//   const [tokenA, setTokenA] = useState<Token>(TOKENS[0]);
//   const [tokenB, setTokenB] = useState<Token>(TOKENS[1]);
//   const [feeTier, setFeeTier] = useState('0.3%');
//   const [tickSpacing, setTickSpacing] = useState('0');
//   const [hooks, setHooks] = useState('0x0000000000000000000000000000000000000000');
//   const [poolId, setPoolId] = useState('');
//   const [sqrtPrice, setSqrtPrice] = useState('');
//   const [currentPrice, setCurrentPrice] = useState<number>(0);

//   const [isFromPool, setIsFromPool] = useState(false);
//   const [rangeType, setRangeType] = useState<'full' | 'custom'>('custom');
//   const [strategy, setStrategy] = useState<'stable' | 'wide' | null>(null);
//   const [minPrice, setMinPrice] = useState(0);
//   const [maxPrice, setMaxPrice] = useState(0);
//   const [copiedId, setCopiedId] = useState<string | null>(null);
//   const isTokenA0 = (tokenA.address || '').toLowerCase() < (tokenB.address || '').toLowerCase();
//   const t0 = isTokenA0 ? tokenA : tokenB;
//   const t1 = isTokenA0 ? tokenB : tokenA;

//   const { address, isConnected } = useAccount();
//   const { open } = useAppKit();
//   const { formattedBalance: balance0 } = useTokenBalance({ token: t0, address });
//   const { formattedBalance: balance1 } = useTokenBalance({ token: t1, address });

//   const { inputAmount, outputAmount, onInputChange, onOutputChange } = useSwapQuote({
//     token0: t0,
//     token1: t1,
//     poolFee: Number(feeTier),
//     tickSpacing: Number(tickSpacing),
//     hooksAddress: hooks,
//     sqrtPriceX96: sqrtPrice,
//   });


//   // Removed custom amount handlers; use hook callbacks instead
//   // const handleAmount0Change = (val: string) => {
//   //   setAmount0(val);
//   //   if (!val || isNaN(Number(val))) {
//   //     setAmount1('');
//   //   } else {
//   //     setAmount1((Number(val) * currentPrice).toFixed(4));
//   //   }
//   // };

//   // const handleAmount1Change = (val: string) => {
//   //   setAmount1(val);
//   //   if (!val || isNaN(Number(val))) {
//   //     setAmount0('');
//   //   } else {
//   //     setAmount0((Number(val) / currentPrice).toFixed(4));
//   //   }
//   // };

//   useEffect(() => {
//     if (params) {
//       const searchParams = new URLSearchParams(params);
//       const c0 = searchParams.get('currency0');
//       const c1 = searchParams.get('currency1');
//       const fee = searchParams.get('fee');
//       const ts = searchParams.get('tickSpacing');
//       const hk = searchParams.get('hooks');
//       const pid = searchParams.get('poolId');
//       const sp = searchParams.get('sqrtPrice');


//       let foundParams = false;

//       if (c0) {
//         const t0 = TOKENS.find(t => (t.address || '').toLowerCase() === c0.toLowerCase() || (c0 === 'NATIVE' && t.address === '0x0000000000000000000000000000000000000000'));
//         if (t0) setTokenA(t0);
//         foundParams = true;
//       }
//       if (c1) {
//         const t1 = TOKENS.find(t => (t.address || '').toLowerCase() === c1.toLowerCase() || (c1 === 'NATIVE' && t.address === '0x0000000000000000000000000000000000000000'));
//         if (t1) setTokenB(t1);
//         foundParams = true;
//       }
//       if (fee) {
//         setFeeTier(fee);
//         foundParams = true;
//       }
//       if (ts) setTickSpacing(ts);
//       if (hk) setHooks(hk);
//       if (pid) {
//         setPoolId(pid);

//         if (sp) {
//           setSqrtPrice(sp);
//           let dec0 = tokenA.decimals;
//           let dec1 = tokenB.decimals;
//           if (c0 && c1) {
//             const parsedT0 = TOKENS.find(t => (t.address || '').toLowerCase() === c0.toLowerCase() || (c0 === 'NATIVE' && t.address === '0x0000000000000000000000000000000000000000'));
//             const parsedT1 = TOKENS.find(t => (t.address || '').toLowerCase() === c1.toLowerCase() || (c1 === 'NATIVE' && t.address === '0x0000000000000000000000000000000000000000'));
//             if (parsedT0 && parsedT1) {
//               const isT0Smaller = (parsedT0.address || '').toLowerCase() < (parsedT1.address || '').toLowerCase();
//               dec0 = isT0Smaller ? parsedT0.decimals : parsedT1.decimals;
//               dec1 = isT0Smaller ? parsedT1.decimals : parsedT0.decimals;
//             }
//           }
//           //
//           const [price0, price1] = sqrtRatioX96ToPrice(sp, dec0, dec1);
//           if (!isNaN(price0) && price0 > 0) {
//             setCurrentPrice(price0);

//             // Calculate and set minPrice and maxPrice right here
//             if (minPrice === 0 && maxPrice === 0) {
//               const minPercent = 1.9;
//               const maxPercent = 1.6;
//               setMinPrice(Math.round(price0 * (1 - minPercent / 100)));
//               setMaxPrice(Math.round(price0 * (1 + maxPercent / 100)));
//             }
//           }
//         } else {
//           // Fetch live price from subgraph fallback
//           fetchSubgraph<{ pool: { token0Price: string; token1Price: string; sqrtPrice: string } | null }>(GET_POOL_BY_ID, { id: pid })
//             .then(data => {
//               if (data.pool) {
//                 setSqrtPrice(data.pool.sqrtPrice);

//                 let dec0 = tokenA.decimals;
//                 let dec1 = tokenB.decimals;
//                 if (c0 && c1) {
//                   const parsedT0 = TOKENS.find(t => (t.address || '').toLowerCase() === c0.toLowerCase() || (c0 === 'NATIVE' && t.address === '0x0000000000000000000000000000000000000000'));
//                   const parsedT1 = TOKENS.find(t => (t.address || '').toLowerCase() === c1.toLowerCase() || (c1 === 'NATIVE' && t.address === '0x0000000000000000000000000000000000000000'));
//                   if (parsedT0 && parsedT1) {
//                     const isT0Smaller = (parsedT0.address || '').toLowerCase() < (parsedT1.address || '').toLowerCase();
//                     dec0 = isT0Smaller ? parsedT0.decimals : parsedT1.decimals;
//                     dec1 = isT0Smaller ? parsedT1.decimals : parsedT0.decimals;
//                   }
//                 }
//                 const [price0] = sqrtRatioX96ToPrice(data.pool.sqrtPrice, dec0, dec1);
//                 if (!isNaN(price0) && price0 > 0) {
//                   setCurrentPrice(price0);

//                   // Calculate and set minPrice and maxPrice right here
//                   if (minPrice === 0 && maxPrice === 0) {
//                     const minPercent = 1.9;
//                     const maxPercent = 1.6;
//                     setMinPrice(Math.round(price0 * (1 - minPercent / 100)));
//                     setMaxPrice(Math.round(price0 * (1 + maxPercent / 100)));
//                   }
//                 }
//               }
//             })
//             .catch(err => console.error('Failed to fetch pool price:', err));
//         }
//       }

//       if (foundParams) setIsFromPool(true);
//     }
//   }, [params]);

//   // Use effect previously here was removed to eliminate delay in UI rendering min/max price

//   // const formatPrice = (price: number) => {
//   //   return price.toLocaleString();
//   // };

//   const feeTiers = [
//     { label: '0.01%', sub: 'STABLE', spacing: '1' },
//     { label: '0.05%', sub: 'BEST', spacing: '10' },
//     { label: '0.3%', sub: 'DEFI', spacing: '60' },
//     { label: '1.00%', sub: 'EXOTIC', spacing: '200' },
//   ];

//   const copyToClipboard = (text: string, id: string) => {
//     navigator.clipboard.writeText(text);
//     setCopiedId(id);
//     setTimeout(() => setCopiedId(null), 2000);
//   };

//   return (
//     <div className="pb-40 max-w-4xl mx-auto relative group/page w-full">
//       {/* Toast notifications */}
//       {toast.show && (
//         <div className="fixed top-15 right-8 z-[100] flex flex-col gap-4 pointer-events-none">
//           <Toast
//             type={toast.type}
//             title={toast.title}
//             message={toast.message}
//             txHash={toast.txHash}
//             onClose={dismissToast}
//           />
//         </div>
//       )}

//       {/* Abstract Background Mesh */}
//       <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 blur-[150px] rounded-full pointer-events-none group-hover/page:bg-primary/10 transition-colors duration-1000"></div>
//       <div className="absolute bottom-40 left-0 w-[300px] h-[300px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

//       {/* Header */}
//       <div className="flex flex-col gap-2 mb-12">
//         <h1 className="text-3xl  text-white tracking-tighter leading-none">Mint Position</h1>
//       </div>

//       <div className="glass-morphism bg-white/[0.01] border border-white/5 p-10 relative overflow-hidden space-y-12">

//         {isFromPool ? (
//           <div className="space-y-6">
//             <div className="flex justify-between items-center">
//               <label className="text-[12px] uppercase tracking-[0.2em] text-white/20">Pool Information</label>
//               <Info size={12} className="text-white/10" />
//             </div>

//             {/* Tokens row */}
//             <div className="flex flex-col md:flex-row gap-4">
//               {/* Token 0 */}
//               <div className="flex-1 bg-white/[0.02] border border-white/5 p-5 flex flex-row items-center gap-4">
//                 <img src={t0.logo} alt={t0.symbol} className="w-10 h-10 rounded-full border border-white/10 shrink-0" />
//                 <div className="flex flex-col gap-1 min-w-0">
//                   <div className="flex items-center gap-2">
//                     <p className="text-sm tracking-tighter text-white">{t0.symbol}</p>
//                     <span className="text-[11px] text-white/20 uppercase tracking-widest">Token0</span>
//                   </div>
//                   <div className="flex items-center gap-1">
//                     <p className="text-[10px] font-mono text-white/40 break-all">{t0.address}</p>
//                     <button onClick={() => copyToClipboard(t0.address || '', 'token0')} className={`transition-colors p-1 shrink-0 cursor-pointer ${copiedId === 'token0' ? 'text-primary' : 'text-white/10 hover:text-primary'}`}>
//                       {copiedId === 'token0' ? <Check size={10} /> : <Copy size={10} />}
//                     </button>
//                   </div>
//                 </div>
//               </div>
//               {/* Token 1 */}
//               <div className="flex-1 bg-white/[0.02] border border-white/5 p-5 flex flex-row items-center gap-4">
//                 <img src={t1.logo} alt={t1.symbol} className="w-10 h-10 rounded-full border border-white/10 shrink-0" />
//                 <div className="flex flex-col gap-1 min-w-0">
//                   <div className="flex items-center gap-2">
//                     <p className="text-sm tracking-tighter text-white">{t1.symbol}</p>
//                     <span className="text-[11px] text-white/20 uppercase tracking-widest">Token1</span>
//                   </div>
//                   <div className="flex items-center gap-1">
//                     <p className="text-[10px] font-mono text-white/40 break-all">{t1.address}</p>
//                     <button onClick={() => copyToClipboard(t1.address || '', 'token1')} className={`transition-colors p-1 shrink-0 cursor-pointer ${copiedId === 'token1' ? 'text-primary' : 'text-white/10 hover:text-primary'}`}>
//                       {copiedId === 'token1' ? <Check size={10} /> : <Copy size={10} />}
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Fee Tier + Tick Spacing — one line */}
//             <div className="grid grid-cols-2 gap-4">
//               <div className="bg-black/40 border border-white/5 px-6 py-4 flex items-center justify-between">
//                 <span className="text-[11px] uppercase tracking-widest text-white/20">Fee Tier</span>
//                 <span className="text-xl tracking-tighter text-primary">{Number(feeTier) / 10000}%</span>
//               </div>
//               <div className="bg-black/40 border border-white/5 px-6 py-4 flex items-center justify-between">
//                 <span className="text-[11px] uppercase tracking-widest text-white/20">Tick Spacing</span>
//                 <span className="text-xl font-mono text-white">{tickSpacing}</span>
//               </div>
//             </div>

//             {/* Hooks Contract — full width */}
//             <div className="bg-black/40 border border-white/5 px-6 py-4 flex items-center justify-between gap-4">
//               <span className="text-[11px] uppercase tracking-widest text-white/20 shrink-0">Hooks Contract</span>
//               {hooks === '0x0000000000000000000000000000000000000000' || hooks === '0' ? (
//                 <span className="text-[12px] font-mono text-white/30 italic">No Hook attached to this pool</span>
//               ) : (
//                 <div className="flex items-center gap-2 min-w-0">
//                   <span className="text-[12px] font-mono text-white/60 break-all">{hooks}</span>
//                   <button onClick={() => copyToClipboard(hooks, 'hooks')} className={`transition-colors p-1 shrink-0 ${copiedId === 'hooks' ? 'text-primary' : 'text-white/10 hover:text-primary'}`}>
//                     {copiedId === 'hooks' ? <Check size={10} /> : <Copy size={10} />}
//                   </button>
//                 </div>
//               )}
//             </div>

//             {/* Pool ID — full width */}
//             <div className="bg-black/40 border border-white/5 px-6 py-4 flex items-center justify-between gap-4">
//               <span className="text-[11px] uppercase tracking-widest text-white/20 shrink-0">Pool ID</span>
//               <div className="flex items-center gap-2 min-w-0">
//                 <span className="text-[12px] font-mono text-white/60 break-all">{poolId}</span>
//                 <button onClick={() => copyToClipboard(poolId, 'poolId')} className={`transition-colors p-1 shrink-0 cursor-pointer ${copiedId === 'poolId' ? 'text-primary' : 'text-white/10 hover:text-primary'}`}>
//                   {copiedId === 'poolId' ? <Check size={10} /> : <Copy size={10} />}
//                 </button>
//               </div>
//             </div>
//           </div>
//         ) : (
//           <>
//             {/* Step 1: Select Pair */}
//             <div className="space-y-6">
//               <div className="flex justify-between items-center">
//                 <label className="text-[12px] uppercase tracking-[0.2em]  text-white/20">Step 1: Select Pair</label>
//                 <Info size={12} className="text-white/10" />
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div className="bg-white/[0.02] border border-white/5 p-6 flex flex-col gap-4">
//                   <span className="text-[11px]  uppercase tracking-widest text-white/20">First Asset</span>
//                   <TokenSelector disabled={isFromPool} selectedToken={tokenA} onSelect={setTokenA} tokens={TOKENS} className="w-full" />
//                 </div>
//                 <div className="bg-white/[0.02] border border-white/5 p-6 flex flex-col gap-4">
//                   <span className="text-[11px]  uppercase tracking-widest text-white/20">Second Asset</span>
//                   <TokenSelector disabled={isFromPool} selectedToken={tokenB} onSelect={setTokenB} tokens={TOKENS} className="w-full" />
//                 </div>
//               </div>

//               {/* Terminal Readout */}
//               <div className="bg-black/40 border border-white/5 p-6 font-mono relative group">
//                 <div className="space-y-3">
//                   <div className="flex items-start gap-4">
//                     <span className="text-primary text-[12px]  w-6">[0]</span>
//                     <div className="flex flex-col gap-1 flex-1">
//                       <div className="flex items-center justify-between">
//                         <div className="flex items-center gap-2">
//                           <span className="text-white text-[12px]  uppercase">{t0.symbol}</span>
//                           <span className="text-white/20 text-[11px] uppercase tracking-widest ">Token0</span>
//                         </div>
//                         <button onClick={() => copyToClipboard(t0.address || '', 't0old')} className={`transition-colors p-1 cursor-pointer ${copiedId === 't0old' ? 'text-primary' : 'text-white/10 hover:text-primary'}`}>
//                           {copiedId === 't0old' ? <Check size={10} /> : <Copy size={10} />}
//                         </button>
//                       </div>
//                       <span className="text-white/40 text-[11px] tracking-widest break-all select-all leading-relaxed uppercase">{t0.address}</span>
//                     </div>
//                   </div>
//                   <div className="flex items-start gap-4 pt-4 border-t border-white/[0.03]">
//                     <span className="text-white/20 text-[12px]  w-6">[1]</span>
//                     <div className="flex flex-col gap-1 flex-1">
//                       <div className="flex items-center justify-between">
//                         <div className="flex items-center gap-2">
//                           <span className="text-white text-[12px]  uppercase">{t1.symbol}</span>
//                           <span className="text-white/20 text-[11px] uppercase tracking-widest ">Token1</span>
//                         </div>
//                         <button onClick={() => copyToClipboard(t1.address || '', 't1old')} className={`transition-colors p-1 cursor-pointer ${copiedId === 't1old' ? 'text-primary' : 'text-white/10 hover:text-primary'}`}>
//                           {copiedId === 't1old' ? <Check size={10} /> : <Copy size={10} />}
//                         </button>
//                       </div>
//                       <span className="text-white/40 text-[11px] tracking-widest break-all select-all leading-relaxed uppercase">{t1.address}</span>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Step 2: Fee Tier */}
//             <div className="space-y-6">
//               <div className="flex justify-between items-center">
//                 <label className="text-[12px] uppercase tracking-[0.2em]  text-white/20">Step 2: Select Fee Tier</label>
//                 <Info size={12} className="text-white/10" />
//               </div>
//               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                 {feeTiers.map((tier) => (
//                   <button
//                     key={tier.label}
//                     disabled={isFromPool && feeTier !== tier.label}
//                     onClick={() => setFeeTier(tier.label)}
//                     className={`flex flex-col text-left transition-all relative overflow-hidden group border-t-2 ${feeTier === tier.label
//                       ? 'bg-white/[0.04] border-primary shadow-[inset_0_0_20px_rgba(255,210,23,0.05)]'
//                       : isFromPool
//                         ? 'bg-white/[0.01] border-white/5 opacity-50 cursor-not-allowed'
//                         : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.02] hover:border-white/10'
//                       }`}
//                   >
//                     <div className="p-6 pb-2">
//                       <span className={`text-3xl  tracking-tighter block leading-none ${feeTier === tier.label ? 'text-primary' : 'text-white'}`}>{tier.label}</span>
//                     </div>
//                     <div className="mt-auto border-t border-white/[0.03] p-4 bg-white/[0.01] flex flex-col gap-1.5">
//                       <div className="flex items-center justify-between">
//                         <span className={`text-[11px]  tracking-widest uppercase ${feeTier === tier.label ? 'text-white' : 'text-white/20'}`}>{tier.sub}</span>
//                         {feeTier === tier.label && <Check size={8} className="text-primary" />}
//                       </div>
//                       <span className={`text-[11px] font-mono tracking-widest uppercase ${feeTier === tier.label ? 'text-primary' : 'text-white/10'}`}>Tick Spacing: {tier.spacing}</span>
//                     </div>
//                     {feeTier === tier.label && <div className="absolute top-0 right-0 w-2 h-2 bg-primary"></div>}
//                   </button>
//                 ))}
//               </div>
//             </div>
//           </>
//         )}

//         {/* Empty, removed original Pool Configuration */}

//         {/* Step 3: Price Range (Redesigned as Technical Corridor) */}
//         <div className="space-y-8">
//           <div className="flex justify-between items-center">
//             <label className="text-[12px] uppercase tracking-[0.2em]  text-white/20">Step 3: Select Price Range</label>
//             <div className="flex bg-white/5 p-1 border border-white/10">
//               {['CUSTOM', 'FULL RANGE'].map((type) => (
//                 <button
//                   key={type}
//                   onClick={() => setRangeType(type === 'FULL RANGE' ? 'full' : 'custom')}
//                   className={`px-4 py-1.5 text-[11px]  uppercase tracking-widest transition-all cursor-pointer ${(type === 'FULL RANGE' && rangeType === 'full') || (type === 'CUSTOM' && rangeType === 'custom')
//                     ? 'bg-primary text-black'
//                     : 'text-white/30 hover:text-white'
//                     }`}
//                 >
//                   {type}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {rangeType === 'custom' && (
//             <div className="flex gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
//               <button
//                 onClick={() => {
//                   setStrategy('stable');
//                   if (currentPrice > 0) {
//                     const strategyPercent = 2; // Stable: -2% / +2%
//                     setMinPrice(Math.round(currentPrice * (1 - strategyPercent / 100)));
//                     setMaxPrice(Math.round(currentPrice * (1 + strategyPercent / 100)));
//                   }
//                 }}
//                 className={`flex-1 py-3 text-[11px] uppercase tracking-widest border transition-all flex flex-col items-center gap-1 cursor-pointer ${strategy === 'stable'
//                   ? 'bg-primary/10 border-primary text-primary'
//                   : 'bg-white/[0.01] border-white/5 text-white/20 hover:text-white/40'
//                   }`}
//               >
//                 <span>STABLE</span>
//                 <span className="text-[10px] tracking-wider opacity-60">-2% / +2%</span>
//               </button>
//               <button
//                 onClick={() => {
//                   setStrategy('wide');
//                   if (currentPrice > 0) {
//                     const minPercent = 50;  // Wide min: -50%
//                     const maxPercent = 100; // Wide max: +100%
//                     setMinPrice(Math.round(currentPrice * (1 - minPercent / 100)));
//                     setMaxPrice(Math.round(currentPrice * (1 + maxPercent / 100)));
//                   }
//                 }}
//                 className={`flex-1 py-3 text-[11px] uppercase tracking-widest border transition-all flex flex-col items-center gap-1 cursor-pointer ${strategy === 'wide'
//                   ? 'bg-primary/10 border-primary text-primary'
//                   : 'bg-white/[0.01] border-white/5 text-white/20 hover:text-white/40'
//                   }`}
//               >
//                 <span>WIDE</span>
//                 <span className="text-[10px] tracking-wider opacity-60">-50% / +100%</span>
//               </button>
//             </div>
//           )}

//           <div className="bg-black/40 border border-white/5 overflow-hidden flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] relative">
//             {/* MIN PRICE */}
//             <div className={`p-8 flex flex-col items-center justify-center gap-4 transition-all ${rangeType === 'full' ? 'opacity-20' : 'opacity-100'}`}>
//               <span className="text-[11px]  uppercase tracking-[0.3em] text-white/20 flex items-center gap-2">
//                 <div className="w-1.5 h-1.5 bg-primary/40"></div>
//                 [ MIN_PRICE ]
//               </span>
//               <div className="flex items-center gap-8">
//                 <button onClick={() => setMinPrice(Math.max(0, minPrice - 100))} disabled={rangeType === 'full'} className="text-white/10 hover:text-primary transition-colors disabled:opacity-0 p-2 border border-white/5 hover:border-primary/20"><Minus size={14} /></button>
//                 <div className="flex flex-col items-center">
//                   {rangeType === 'full' ? (
//                     <span className="text-3xl  text-white tracking-tighter font-mono">0</span>
//                   ) : (
//                     <input
//                       type="text"
//                       className="bg-transparent border-none text-3xl  text-center w-full focus:ring-0 text-white outline-none font-mono tracking-tighter p-0"
//                       value={formatPrice(minPrice.toString())}
//                       onChange={(e) => {
//                         const val = e.target.value.replace(/,/g, '');
//                         if (val === '' || !isNaN(Number(val))) setMinPrice(val === '' ? 0 : Number(val));
//                       }}
//                     />
//                   )}
//                   <span className="text-[11px] font-mono text-primary/60 uppercase tracking-[0.2em] mt-1">{currentPrice > 0 ? `${(((minPrice - currentPrice) / currentPrice) * 100).toFixed(1)}% OFFSET` : ''}</span>
//                 </div>
//                 <button onClick={() => setMinPrice(minPrice + 100)} disabled={rangeType === 'full'} className="text-white/10 hover:text-primary transition-colors disabled:opacity-0 p-2 border border-white/5 hover:border-primary/20"><Plus size={14} /></button>
//               </div>
//             </div>

//             {/* CENTRAL ANCHOR */}
//             <div className="bg-white/5 border-y md:border-y-0 md:border-x border-white/5 flex flex-col items-center justify-center px-6 py-4 md:py-0">
//               <div className="flex flex-col items-center relative gap-2">
//                 <span className="text-[11px]  tracking-[0.3em] text-primary uppercase">PRICE</span>
//                 <p className="text-sm  text-white font-mono tracking-tighter">{currentPrice > 0 ? currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</p>
//                 <span className="text-[10px]  text-white/20 uppercase tracking-widest">{t1.symbol}/{t0.symbol}</span>
//               </div>
//             </div>

//             {/* MAX PRICE */}
//             <div className={`p-8 flex flex-col items-center justify-center gap-4 transition-all ${rangeType === 'full' ? 'opacity-20' : 'opacity-100'}`}>
//               <span className="text-[11px]  uppercase tracking-[0.3em] text-white/20 flex items-center gap-2">
//                 [ MAX_PRICE ]
//                 <div className="w-1.5 h-1.5 bg-primary/40"></div>
//               </span>
//               <div className="flex items-center gap-8">
//                 <button onClick={() => setMaxPrice(Math.max(minPrice + 100, maxPrice - 100))} disabled={rangeType === 'full'} className="text-white/10 hover:text-primary transition-colors disabled:opacity-0 p-2 border border-white/5 hover:border-primary/20"><Minus size={14} /></button>
//                 <div className="flex flex-col items-center">
//                   {rangeType === 'full' ? (
//                     <Infinity size={32} className="text-white opacity-40 my-1 font-mono" />
//                   ) : (
//                     <div className="flex flex-col items-center">
//                       <input
//                         type="text"
//                         className="bg-transparent border-none text-3xl  text-center w-full focus:ring-0 text-white outline-none font-mono tracking-tighter p-0"
//                         value={formatPrice(maxPrice.toString())}
//                         onChange={(e) => {
//                           const val = e.target.value.replace(/,/g, '');
//                           if (val === '' || !isNaN(Number(val))) setMaxPrice(val === '' ? 0 : Number(val));
//                         }}
//                       />
//                       <span className="text-[11px] font-mono text-primary/60 uppercase tracking-[0.2em] mt-1">{currentPrice > 0 ? `+${(((maxPrice - currentPrice) / currentPrice) * 100).toFixed(1)}% OFFSET` : ''}</span>
//                     </div>
//                   )}
//                 </div>
//                 <button onClick={() => setMaxPrice(maxPrice + 100)} disabled={rangeType === 'full'} className="text-white/10 hover:text-primary transition-colors disabled:opacity-0 p-2 border border-white/5 hover:border-primary/20"><Plus size={14} /></button>
//               </div>
//             </div>
//           </div>

//         </div>

//         {/* Step 4: Deposit Amount */}
//         <div className="space-y-6">
//           <div className="flex justify-between items-center">
//             <label className="text-[12px] uppercase tracking-[0.2em]  text-white/20">Step 4: Deposit Tokens</label>
//             <Info size={12} className="text-white/10" />
//           </div>

//           <div className="space-y-4">
//             <div className="bg-black/40 border border-white/5 p-6 flex flex-col gap-4 group focus-within:border-primary/40 transition-all">
//               <div className="flex justify-between items-end">
//                 <div className="flex flex-col gap-1">
//                   <span className="text-[11px]  uppercase tracking-widest text-white/20">Amount to Deposit</span>
//                   <input
//                     className="bg-transparent border-none text-3xl p-0 focus:ring-0 text-white outline-none w-full"
//                     placeholder="0.0"
//                     type="text"
//                     value={inputAmount}
//                     onChange={(e) => onInputChange(e.target.value)}
//                   />
//                 </div>
//                 <div className="flex flex-col items-end gap-2">
//                   <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 border border-white/10">
//                     <img className="h-4 w-4 rounded-full" src={t0.logo} alt={t0.symbol} />
//                     <span className="text-xs  text-white tracking-widest ">{t0.symbol}</span>
//                   </div>
//                   <span className="text-[11px] font-mono text-white/20 uppercase tracking-widest">Balance: {balance0}</span>
//                 </div>
//               </div>
//             </div>

//             <div className="bg-black/40 border border-white/5 p-6 flex flex-col gap-4 group focus-within:border-primary/40 transition-all">
//               <div className="flex justify-between items-end">
//                 <div className="flex flex-col gap-1">
//                   <span className="text-[11px]  uppercase tracking-widest text-white/20">Amount to Deposit</span>
//                   <input
//                     className="bg-transparent border-none text-3xl p-0 focus:ring-0 text-white outline-none w-full"
//                     placeholder="0.0"
//                     type="text"
//                     value={outputAmount}
//                     onChange={(e) => onOutputChange(e.target.value)}
//                   />
//                 </div>
//                 <div className="flex flex-col items-end gap-2">
//                   <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 border border-white/10">
//                     <img className="h-4 w-4 rounded-full" src={t1.logo} alt={t1.symbol} />
//                     <span className="text-xs  text-white tracking-widest uppercase">{t1.symbol}</span>
//                   </div>
//                   <span className="text-[11px] font-mono text-white/20 uppercase tracking-widest">Balance: {balance1}</span>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Primary Action Button */}
//         <div className="pt-4">
//           {!isConnected ? (
//             <button
//               onClick={() => open()}
//               className="w-full bg-primary text-black py-4 px-6 rounded-full text-[14px] uppercase tracking-[0.2em] font-bold transition-all gold-glow hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
//             >
//               Connect Wallet
//             </button>
//           ) : (
//             <button
//               disabled={isConfirming}
//               onClick={() => {
//                 const feeMap: Record<string, string> = {
//                   '0.01%': '100',
//                   '0.05%': '500',
//                   '0.3%': '3000',
//                   '1.00%': '10000'
//                 };
//                 const rawFee = feeMap[feeTier] || feeTier;
//                 console.log("TickSpacing: ", tickSpacing)

//                 mintPosition({
//                   token0: t0.address || '',
//                   token1: t1.address || '',
//                   feeTier: rawFee,
//                   tickSpacing,
//                   hooks,
//                   poolId,
//                   amount0: parseUnits(inputAmount, t0.decimals).toString(),
//                   amount1: parseUnits(outputAmount, t1.decimals).toString(),
//                   minTick: rangeType === 'full' ? MIN_TICK : priceToTick(minPrice, t0.decimals, t1.decimals, tickSpacing),
//                   maxTick: rangeType === 'full' ? MAX_TICK : priceToTick(maxPrice, t0.decimals, t1.decimals, tickSpacing),
//                   sqrtPrice,
//                 });
//               }}
//               className={`w-full bg-primary text-black py-4 px-6 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold transition-all gold-glow hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer ${isConfirming ? 'opacity-50 cursor-not-allowed' : ''}`}
//             >
//               {isConfirming ? 'Minting Position...' : 'Mint Position'}
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }



import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Info, Minus, Plus, Infinity, AlertCircle } from 'lucide-react';
import TokenSelector, { Token } from '@/components/TokenSelector';
import TokenImage from '@/components/TokenImage';
import { TOKENS } from '@/config/tokens';
import { useTokenMetadata } from '@/hooks/shared/useTokenMetadata';
import { useModifyLiquidity } from '@/hooks/liquidity/useModifyLiquidity';
import { sqrtRatioX96ToPrice } from '@/utils/liquidityMath/fullMath';
import { LiquidityAmounts, getSqrtRatioAtTick, priceToSqrtPriceX96 } from '@/utils/liquidityMath/liquidityAmounts';
import { fetchSubgraph, GET_POOL_BY_ID } from '@/lib/queries';
import { parseUnits, formatUnits, isAddress } from 'viem';
import Toast from '@/components/Toast';
import { useAccount, usePublicClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useTokenBalance } from '@/hooks/shared/useTokenBalance';
import { formatPrice, computePoolId } from '@/utils';
import { STATEVIEW_ADDRESS } from '@/lib/constants';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const formatInputPrice = (value: number): string => {
  if (value === 0 || isNaN(value)) return '0';
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(4).replace(/\.?0+$/, '');
  if (value >= 0.0001) return value.toFixed(6).replace(/\.?0+$/, '');
  return value.toFixed(8).replace(/\.?0+$/, '');
};

export default function CreatePositionPage() {
  const { params } = useParams();
  const publicClient = usePublicClient();
  const { MIN_TICK, MAX_TICK, priceToTick, mintPosition, toast, dismissToast, isConfirming } = useModifyLiquidity();

  const [tokenA, setTokenA] = useState<Token>(TOKENS[0]);
  const [tokenB, setTokenB] = useState<Token>(TOKENS[1]);
  const [feeTier, setFeeTier] = useState('0.3%');
  const [tickSpacing, setTickSpacing] = useState('0');
  const [hooks, setHooks] = useState(ZERO_ADDRESS);
  const [hookAddressInput, setHookAddressInput] = useState('');
  const [poolId, setPoolId] = useState('');
  const [sqrtPrice, setSqrtPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  const [isFromPool, setIsFromPool] = useState(false);
  const [rangeType, setRangeType] = useState<'full' | 'custom'>('custom');
  const [strategy, setStrategy] = useState<'stable' | 'wide' | null>(null);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [minPriceInput, setMinPriceInput] = useState('0');
  const [maxPriceInput, setMaxPriceInput] = useState('0');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Use these whenever min/max price change programmatically (buttons, strategy presets,
  // URL params) so the numeric state and the text field stay in sync.
  const updateMinPrice = (value: number) => {
    const cleanVal = Math.max(0, value);
    setMinPrice(cleanVal);
    setMinPriceInput(formatInputPrice(cleanVal));
  };
  const updateMaxPrice = (value: number) => {
    const cleanVal = Math.max(0, value);
    setMaxPrice(cleanVal);
    setMaxPriceInput(formatInputPrice(cleanVal));
  };

  // Allows free typing (including a trailing "." or a leading "-") while keeping
  // the numeric minPrice/maxPrice in sync for offset % and tick calculations.
  const handleMinPriceInputChange = (raw: string) => {
    const cleaned = raw.replace(/,/g, '');
    if (cleaned === '' || /^-?\d*\.?\d*$/.test(cleaned)) {
      setMinPriceInput(cleaned);
      const parsed = parseFloat(cleaned);
      setMinPrice(isNaN(parsed) ? 0 : parsed);
    }
  };
  const handleMaxPriceInputChange = (raw: string) => {
    const cleaned = raw.replace(/,/g, '');
    if (cleaned === '' || /^-?\d*\.?\d*$/.test(cleaned)) {
      setMaxPriceInput(cleaned);
      const parsed = parseFloat(cleaned);
      setMaxPrice(isNaN(parsed) ? 0 : parsed);
    }
  };
  const isTokenA0 = (tokenA.address || '').toLowerCase() < (tokenB.address || '').toLowerCase();
  const t0 = isTokenA0 ? tokenA : tokenB;
  const t1 = isTokenA0 ? tokenB : tokenA;

  const { metadata: metaA } = useTokenMetadata(
    !TOKENS.find(t => t.address.toLowerCase() === tokenA.address.toLowerCase()) ? tokenA.address : undefined
  );
  const { metadata: metaB } = useTokenMetadata(
    !TOKENS.find(t => t.address.toLowerCase() === tokenB.address.toLowerCase()) ? tokenB.address : undefined
  );

  useEffect(() => {
    if (metaA && tokenA && !TOKENS.find(t => t.address.toLowerCase() === tokenA.address.toLowerCase())) {
      if (tokenA.name !== metaA.name || tokenA.symbol !== metaA.symbol || tokenA.decimals !== metaA.decimals) {
        setTokenA(prev => prev ? { ...prev, name: metaA.name, symbol: metaA.symbol, decimals: metaA.decimals } : prev);
      }
    }
  }, [metaA, tokenA]);

  useEffect(() => {
    if (metaB && tokenB && !TOKENS.find(t => t.address.toLowerCase() === tokenB.address.toLowerCase())) {
      if (tokenB.name !== metaB.name || tokenB.symbol !== metaB.symbol || tokenB.decimals !== metaB.decimals) {
        setTokenB(prev => prev ? { ...prev, name: metaB.name, symbol: metaB.symbol, decimals: metaB.decimals } : prev);
      }
    }
  }, [metaB, tokenB]);

  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { formattedBalance: balance0 } = useTokenBalance({ token: t0, address });
  const { formattedBalance: balance1 } = useTokenBalance({ token: t1, address });

  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');

  const calculateAmountsFromAmount0 = useCallback((amount0Str: string) => {
    if (!amount0Str || isNaN(Number(amount0Str)) || Number(amount0Str) <= 0) {
      setInputAmount(amount0Str);
      setOutputAmount('');
      return;
    }

    setInputAmount(amount0Str);

    try {
      ///////////////////////////////////////////////
      const parsedAmount0 = parseUnits(amount0Str, t0.decimals);
      const tickSpacingNum = Math.max(1, Number(tickSpacing) || 60);
      const fullMinTick = Math.ceil(MIN_TICK / tickSpacingNum) * tickSpacingNum;
      const fullMaxTick = Math.floor(MAX_TICK / tickSpacingNum) * tickSpacingNum;

      let tLower = rangeType === 'full' ? fullMinTick : priceToTick(minPrice, t0.decimals, t1.decimals, tickSpacingNum);
      let tUpper = rangeType === 'full' ? fullMaxTick : priceToTick(maxPrice, t0.decimals, t1.decimals, tickSpacingNum);

      if (tLower >= tUpper) {
        tUpper = tLower + tickSpacingNum;
      }

      const sqrtPriceAX96 = getSqrtRatioAtTick(tLower);
      const sqrtPriceBX96 = getSqrtRatioAtTick(tUpper);
      
      let sqrtPriceX96 = BigInt(sqrtPrice || '0');
      if (sqrtPriceX96 === 0n && currentPrice > 0) {
        try {
          sqrtPriceX96 = priceToSqrtPriceX96(currentPrice, t0.decimals, t1.decimals);
        } catch (_) {}
      }
      if (sqrtPriceX96 === 0n) {
        sqrtPriceX96 = sqrtPriceAX96;
      }

      let liquidity = 0n;
      let calculatedAmount1 = 0n;

      if (sqrtPriceAX96 >= sqrtPriceBX96) {
        setOutputAmount('');
        return;
      }

      if (sqrtPriceX96 <= sqrtPriceAX96) {
        liquidity = LiquidityAmounts.getLiquidityForAmount0(sqrtPriceAX96, sqrtPriceBX96, parsedAmount0);
        calculatedAmount1 = 0n;
      } else if (sqrtPriceX96 < sqrtPriceBX96) {
        liquidity = LiquidityAmounts.getLiquidityForAmount0(sqrtPriceX96, sqrtPriceBX96, parsedAmount0);
        calculatedAmount1 = LiquidityAmounts.getAmount1ForLiquidity(sqrtPriceAX96, sqrtPriceX96, liquidity);
      } else {
        liquidity = 0n;
        calculatedAmount1 = 0n;
      }

      const formattedAmount1 = formatUnits(calculatedAmount1, t1.decimals);
      setOutputAmount(Number(formattedAmount1) === 0 ? '0' : Number(formattedAmount1).toFixed(6).replace(/\.?0+$/, ''));
    } catch (e) {
      console.error("Error calculating liquidity amounts:", e);
    }
  }, [t0, t1, minPrice, maxPrice, rangeType, tickSpacing, sqrtPrice, currentPrice, priceToTick, MIN_TICK, MAX_TICK]);

  useEffect(() => {
    calculateAmountsFromAmount0(inputAmount);
  }, [minPrice, maxPrice, rangeType, tickSpacing, sqrtPrice, currentPrice, calculateAmountsFromAmount0]);

  const handleHookAddressChange = (val: string) => {
    const trimmed = val.trim();
    setHookAddressInput(trimmed);

    if (trimmed === '') {
      setHooks(ZERO_ADDRESS);
      return;
    }

    if (isAddress(trimmed)) {
      setHooks(trimmed);
    }
    // If it's invalid/incomplete, we don't update `hooks` yet -
    // it keeps its last valid value until a full valid address is entered.
  };

  const isHookInputInvalid = hookAddressInput.trim() !== '' && !isAddress(hookAddressInput.trim());

  useEffect(() => {
    if (params) {
      const searchParams = new URLSearchParams(params);
      const c0 = searchParams.get('currency0');
      const c1 = searchParams.get('currency1');
      const fee = searchParams.get('fee');
      const ts = searchParams.get('tickSpacing');
      const hk = searchParams.get('hooks');
      const pid = searchParams.get('poolId');
      const sp = searchParams.get('sqrtPrice');


      let foundParams = false;

      if (c0) {
        const nativeAddr = '0x0000000000000000000000000000000000000000';
        const t0 = TOKENS.find(t => (t.address || '').toLowerCase() === c0.toLowerCase() || (c0 === 'NATIVE' && t.address === nativeAddr));
        if (t0) {
          setTokenA(t0);
        } else if (c0 === 'NATIVE') {
          setTokenA({ address: nativeAddr as `0x${string}`, name: 'Native', symbol: 'NATIVE', decimals: 18, logo: '' });
        } else {
          setTokenA({ address: c0 as `0x${string}`, name: 'Loading...', symbol: '...', decimals: 18, logo: '' });
        }
        foundParams = true;
      }
      if (c1) {
        const nativeAddr = '0x0000000000000000000000000000000000000000';
        const t1 = TOKENS.find(t => (t.address || '').toLowerCase() === c1.toLowerCase() || (c1 === 'NATIVE' && t.address === nativeAddr));
        if (t1) {
          setTokenB(t1);
        } else if (c1 === 'NATIVE') {
          setTokenB({ address: nativeAddr as `0x${string}`, name: 'Native', symbol: 'NATIVE', decimals: 18, logo: '' });
        } else {
          setTokenB({ address: c1 as `0x${string}`, name: 'Loading...', symbol: '...', decimals: 18, logo: '' });
        }
        foundParams = true;
      }
      if (fee) {
        setFeeTier(fee);
        foundParams = true;
      }
      if (ts) setTickSpacing(ts);
      if (hk) {
        setHooks(hk);
        setHookAddressInput(hk === ZERO_ADDRESS ? '' : hk);
      }
      if (pid) {
        setPoolId(pid);

        let dec0 = tokenA.decimals;
        let dec1 = tokenB.decimals;
        if (c0 && c1) {
          const parsedT0 = TOKENS.find(t => (t.address || '').toLowerCase() === c0.toLowerCase() || (c0 === 'NATIVE' && t.address === '0x0000000000000000000000000000000000000000'));
          const parsedT1 = TOKENS.find(t => (t.address || '').toLowerCase() === c1.toLowerCase() || (c1 === 'NATIVE' && t.address === '0x0000000000000000000000000000000000000000'));
          if (parsedT0 && parsedT1) {
            const isT0Smaller = (parsedT0.address || '').toLowerCase() < (parsedT1.address || '').toLowerCase();
            dec0 = isT0Smaller ? parsedT0.decimals : parsedT1.decimals;
            dec1 = isT0Smaller ? parsedT1.decimals : parsedT0.decimals;
          }
        }

        if (sp && sp !== '0') {
          setSqrtPrice(sp);
          const [price0] = sqrtRatioX96ToPrice(sp, dec0, dec1);
          if (!isNaN(price0) && price0 > 0) {
            setCurrentPrice(price0);
            if (minPrice === 0 && maxPrice === 0) {
              updateMinPrice(price0 * 0.98);
              updateMaxPrice(price0 * 1.02);
            }
          }
        }

        // Fetch authoritative on-chain slot0 via StateView
        if (publicClient && pid) {
          publicClient.readContract({
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
            args: [pid as `0x${string}`],
          }).then((slot0: any) => {
            if (slot0 && slot0[0] > 0n) {
              const liveSp = slot0[0].toString();
              setSqrtPrice(liveSp);
              const [livePrice0] = sqrtRatioX96ToPrice(liveSp, dec0, dec1);
              if (!isNaN(livePrice0) && livePrice0 > 0) {
                setCurrentPrice(livePrice0);
                if (minPrice === 0 && maxPrice === 0) {
                  updateMinPrice(livePrice0 * 0.98);
                  updateMaxPrice(livePrice0 * 1.02);
                }
              }
            }
          }).catch(err => {
            console.warn('Failed to read slot0 from StateView, trying fallback:', err);
            // Fallback to subgraph
            fetchSubgraph<{ pool: { token0Price: string; token1Price: string; sqrtPrice: string } | null }>(GET_POOL_BY_ID, { id: pid })
              .then(data => {
                if (data.pool?.sqrtPrice) {
                  setSqrtPrice(data.pool.sqrtPrice);
                  const [p0] = sqrtRatioX96ToPrice(data.pool.sqrtPrice, dec0, dec1);
                  if (!isNaN(p0) && p0 > 0) {
                    setCurrentPrice(p0);
                    if (minPrice === 0 && maxPrice === 0) {
                      updateMinPrice(p0 * 0.98);
                      updateMaxPrice(p0 * 1.02);
                    }
                  }
                }
              })
              .catch(() => {});
          });
        }
      }

      if (foundParams) setIsFromPool(true);
    }
  }, [params]);

  const feeTiers = [
    { label: '0.01%', sub: 'STABLE', spacing: '1' },
    { label: '0.05%', sub: 'BEST', spacing: '10' },
    { label: '0.3%', sub: 'DEFI', spacing: '60' },
    { label: '1.00%', sub: 'EXOTIC', spacing: '200' },
  ];

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="pb-32 sm:pb-40 max-w-4xl mx-auto relative group/page w-full px-4 sm:px-6 md:px-0">
      {/* Toast notifications */}
      {toast.show && (
        <div className="fixed top-15 right-8 z-[100] flex flex-col gap-4 pointer-events-none">
          <Toast
            type={toast.type}
            title={toast.title}
            message={toast.message}
            txHash={toast.txHash}
            onClose={dismissToast}
          />
        </div>
      )}

      {/* Abstract Background Mesh */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 blur-[150px] rounded-full pointer-events-none group-hover/page:bg-primary/10 transition-colors duration-1000"></div>
      <div className="absolute bottom-40 left-0 w-[300px] h-[300px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col gap-1 mb-8">
        <Link to="/pools" className="flex items-center gap-2 text-ash hover:text-white transition-colors mb-4 group w-fit text-xs font-medium">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Pools</span>
        </Link>
        <div className="section-tag mb-1">[ Liquidity ]</div>
        <h1 className="type-h1 font-display text-white">Mint Position</h1>
      </div>

      <div className="bg-[#121212] border border-[color:var(--border-default)] p-4 sm:p-6 md:p-8 rounded-[6px] relative overflow-hidden space-y-8">

        {isFromPool ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[11px] uppercase tracking-wider text-ash font-medium">Pool Information</label>
              <Info size={13} className="text-ash/40" />
            </div>

             {/* Tokens row */}
             <div className="flex flex-col md:flex-row gap-4">
               {/* Token 0 */}
               <div className="flex-1 bg-[#151515] border border-[color:var(--border-subtle)] p-4 rounded-[6px] flex flex-row items-center gap-3">
                 <div className="w-9 h-9 rounded-full border border-white/10 shrink-0 overflow-hidden">
                   <TokenImage tokenAddress={t0.address} symbol={t0.symbol} className="w-full h-full" alt={t0.symbol} />
                 </div>
                 <div className="flex flex-col gap-0.5 min-w-0">
                   <div className="flex items-center gap-2">
                     <p className="text-sm font-medium text-bone">{t0.symbol}</p>
                     <span className="text-[10px] text-ash uppercase font-mono">Token0</span>
                   </div>
                   <div className="flex items-center gap-1">
                     <p className="text-[11px] font-mono text-ash break-all">{t0.address}</p>
                     <button onClick={() => copyToClipboard(t0.address || '', 'token0')} className={`transition-colors p-1 shrink-0 cursor-pointer ${copiedId === 'token0' ? 'text-emerald-400' : 'text-ash/40 hover:text-white'}`}>
                       {copiedId === 'token0' ? <Check size={11} /> : <Copy size={11} />}
                     </button>
                   </div>
                 </div>
               </div>
               {/* Token 1 */}
               <div className="flex-1 bg-[#151515] border border-[color:var(--border-subtle)] p-4 rounded-[6px] flex flex-row items-center gap-3">
                 <div className="w-9 h-9 rounded-full border border-white/10 shrink-0 overflow-hidden">
                   <TokenImage tokenAddress={t1.address} symbol={t1.symbol} className="w-full h-full" alt={t1.symbol} />
                 </div>
                 <div className="flex flex-col gap-0.5 min-w-0">
                   <div className="flex items-center gap-2">
                     <p className="text-sm font-medium text-bone">{t1.symbol}</p>
                     <span className="text-[10px] text-ash uppercase font-mono">Token1</span>
                   </div>
                   <div className="flex items-center gap-1">
                     <p className="text-[11px] font-mono text-ash break-all">{t1.address}</p>
                     <button onClick={() => copyToClipboard(t1.address || '', 'token1')} className={`transition-colors p-1 shrink-0 cursor-pointer ${copiedId === 'token1' ? 'text-emerald-400' : 'text-ash/40 hover:text-white'}`}>
                       {copiedId === 'token1' ? <Check size={11} /> : <Copy size={11} />}
                     </button>
                   </div>
                 </div>
               </div>
             </div>

            {/* Fee Tier + Tick Spacing — one line */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#151515] border border-[color:var(--border-subtle)] px-4 py-3 rounded-[6px] flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash font-medium">Fee Tier</span>
                <span className="text-sm font-mono text-bone font-medium">{Number(feeTier) / 10000}%</span>
              </div>
              <div className="bg-[#151515] border border-[color:var(--border-subtle)] px-4 py-3 rounded-[6px] flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash font-medium">Tick Spacing</span>
                <span className="text-sm font-mono text-bone">{tickSpacing}</span>
              </div>
            </div>

            {/* Hooks Contract — full width */}
            <div className="bg-[#151515] border border-[color:var(--border-subtle)] px-4 py-3 rounded-[6px] flex items-center justify-between gap-4">
              <span className="text-[11px] uppercase tracking-wider text-ash font-medium shrink-0">Hooks Contract</span>
              {hooks === '0x0000000000000000000000000000000000000000' || hooks === '0' ? (
                <span className="text-[11px] font-mono text-ash italic">No Hook attached to this pool</span>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-mono text-bone break-all">{hooks}</span>
                  <button onClick={() => copyToClipboard(hooks, 'hooks')} className={`transition-colors p-1 shrink-0 ${copiedId === 'hooks' ? 'text-emerald-400' : 'text-ash/40 hover:text-white'}`}>
                    {copiedId === 'hooks' ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                </div>
              )}
            </div>

            {/* Pool ID — full width */}
            <div className="bg-[#151515] border border-[color:var(--border-subtle)] px-4 py-3 rounded-[6px] flex items-center justify-between gap-4">
              <span className="text-[11px] uppercase tracking-wider text-ash font-medium shrink-0">Pool ID</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-mono text-ash break-all">{poolId}</span>
                <button onClick={() => copyToClipboard(poolId, 'poolId')} className={`transition-colors p-1 shrink-0 cursor-pointer ${copiedId === 'poolId' ? 'text-emerald-400' : 'text-ash/40 hover:text-white'}`}>
                  {copiedId === 'poolId' ? <Check size={11} /> : <Copy size={11} />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Step 1: Select Pair */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="text-[12px] uppercase tracking-[0.2em]  text-white/20">Step 1: Select Pair</label>
                <Info size={12} className="text-white/10" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/[0.02] border border-white/5 p-6 flex flex-col gap-4">
                  <span className="text-[11px]  uppercase tracking-widest text-white/20">First Asset</span>
                  <TokenSelector disabled={isFromPool} selectedToken={tokenA} onSelect={setTokenA} tokens={TOKENS} className="w-full" />
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-6 flex flex-col gap-4">
                  <span className="text-[11px]  uppercase tracking-widest text-white/20">Second Asset</span>
                  <TokenSelector disabled={isFromPool} selectedToken={tokenB} onSelect={setTokenB} tokens={TOKENS} className="w-full" />
                </div>
              </div>

              {/* Terminal Readout */}
              <div className="bg-black/40 border border-white/5 p-6 font-mono relative group">
                <div className="space-y-3">
                  <div className="flex items-start gap-4">
                    <span className="text-primary text-[12px]  w-6">[0]</span>
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-[12px]  uppercase">{t0.symbol}</span>
                          <span className="text-white/20 text-[11px] uppercase tracking-widest ">Token0</span>
                        </div>
                        <button onClick={() => copyToClipboard(t0.address || '', 't0old')} className={`transition-colors p-1 cursor-pointer ${copiedId === 't0old' ? 'text-primary' : 'text-white/10 hover:text-primary'}`}>
                          {copiedId === 't0old' ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                      </div>
                      <span className="text-white/40 text-[11px] tracking-widest break-all select-all leading-relaxed uppercase">{t0.address}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 pt-4 border-t border-white/[0.03]">
                    <span className="text-white/20 text-[12px]  w-6">[1]</span>
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-[12px]  uppercase">{t1.symbol}</span>
                          <span className="text-white/20 text-[11px] uppercase tracking-widest ">Token1</span>
                        </div>
                        <button onClick={() => copyToClipboard(t1.address || '', 't1old')} className={`transition-colors p-1 cursor-pointer ${copiedId === 't1old' ? 'text-primary' : 'text-white/10 hover:text-primary'}`}>
                          {copiedId === 't1old' ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                      </div>
                      <span className="text-white/40 text-[11px] tracking-widest break-all select-all leading-relaxed uppercase">{t1.address}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Fee Tier */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="text-[12px] uppercase tracking-[0.2em]  text-white/20">Step 2: Select Fee Tier</label>
                <Info size={12} className="text-white/10" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {feeTiers.map((tier) => (
                  <button
                    key={tier.label}
                    disabled={isFromPool && feeTier !== tier.label}
                    onClick={() => setFeeTier(tier.label)}
                    className={`flex flex-col text-left transition-all relative overflow-hidden group border-t-2 ${feeTier === tier.label
                      ? 'bg-white/[0.04] border-primary shadow-[inset_0_0_20px_rgba(255,210,23,0.05)]'
                      : isFromPool
                        ? 'bg-white/[0.01] border-white/5 opacity-50 cursor-not-allowed'
                        : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.02] hover:border-white/10'
                      }`}
                  >
                    <div className="p-6 pb-2">
                      <span className={`text-3xl  tracking-tighter block leading-none ${feeTier === tier.label ? 'text-primary' : 'text-white'}`}>{tier.label}</span>
                    </div>
                    <div className="mt-auto border-t border-white/[0.03] p-4 bg-white/[0.01] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px]  tracking-widest uppercase ${feeTier === tier.label ? 'text-white' : 'text-white/20'}`}>{tier.sub}</span>
                        {feeTier === tier.label && <Check size={8} className="text-primary" />}
                      </div>
                      <span className={`text-[11px] font-mono tracking-widest uppercase ${feeTier === tier.label ? 'text-primary' : 'text-white/10'}`}>Tick Spacing: {tier.spacing}</span>
                    </div>
                    {feeTier === tier.label && <div className="absolute top-0 right-0 w-2 h-2 bg-primary"></div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Hook Details Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="text-[12px] uppercase tracking-[0.2em]  text-white/20">Step 3: Hook Details (Optional)</label>
                <Info size={12} className="text-white/10" />
              </div>

              <div className="bg-black/40 border border-white/5 p-6 flex flex-col gap-4 group focus-within:border-primary/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-widest text-white/20">Hook Contract Address</span>
                  {hookAddressInput.trim() === '' ? (
                    <span className="text-[11px] font-mono text-white/20 italic">No hook</span>
                  ) : isHookInputInvalid ? (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-red-400/80">
                      <AlertCircle size={10} /> Invalid address
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-primary/80">
                      <Check size={10} /> Valid
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="0x0000000000000000000000000000000000000000"
                  className={`bg-transparent border-none text-sm p-0 focus:ring-0 outline-none w-full font-mono tracking-tight ${isHookInputInvalid ? 'text-red-400' : 'text-white'
                    }`}
                  value={hookAddressInput}
                  onChange={(e) => handleHookAddressChange(e.target.value)}
                  spellCheck={false}
                />
                <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                  Leave empty to create a pool with no hook (address(0))
                </span>
              </div>
            </div>
          </>
        )}

        {/* Empty, removed original Pool Configuration */}

        {/* Step 4: Price Range */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[11px] uppercase tracking-wider text-ash font-medium">Step 4: Select Price Range</label>
            <div className="flex gap-1 bg-[#151515] p-1 rounded-[4px] border border-[color:var(--border-subtle)]">
              {['CUSTOM', 'FULL RANGE'].map((type) => (
                <button
                  key={type}
                  onClick={() => setRangeType(type === 'FULL RANGE' ? 'full' : 'custom')}
                  className={`px-3 py-1 text-[11px] font-mono rounded-[3px] transition-all cursor-pointer ${(type === 'FULL RANGE' && rangeType === 'full') || (type === 'CUSTOM' && rangeType === 'custom')
                    ? 'bg-white/[0.1] text-bone font-medium'
                    : 'text-ash hover:text-white'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {rangeType === 'custom' && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStrategy('stable');
                  if (currentPrice > 0) {
                    updateMinPrice(currentPrice * 0.98);
                    updateMaxPrice(currentPrice * 1.02);
                  }
                }}
                className={`flex-1 py-2.5 px-3 text-xs font-mono rounded-[4px] border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${strategy === 'stable'
                  ? 'bg-white/[0.08] border-white/30 text-bone'
                  : 'bg-[#151515] border-[color:var(--border-subtle)] text-ash hover:text-white'
                  }`}
              >
                <span className="font-medium">STABLE</span>
                <span className="text-[10px] text-ash/70">-2% / +2%</span>
              </button>
              <button
                onClick={() => {
                  setStrategy('wide');
                  if (currentPrice > 0) {
                    updateMinPrice(currentPrice * 0.5);
                    updateMaxPrice(currentPrice * 2.0);
                  }
                }}
                className={`flex-1 py-2.5 px-3 text-xs font-mono rounded-[4px] border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${strategy === 'wide'
                  ? 'bg-white/[0.08] border-white/30 text-bone'
                  : 'bg-[#151515] border-[color:var(--border-subtle)] text-ash hover:text-white'
                  }`}
              >
                <span className="font-medium">WIDE</span>
                <span className="text-[10px] text-ash/70">-50% / +100%</span>
              </button>
            </div>
          )}

          <div className="bg-[#151515] border border-[color:var(--border-subtle)] rounded-[6px] overflow-hidden flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] relative">
            {/* MIN PRICE */}
            <div className={`p-6 flex flex-col items-center justify-center gap-3 transition-all ${rangeType === 'full' ? 'opacity-20' : 'opacity-100'}`}>
              <span className="text-[11px] uppercase tracking-wider text-ash font-medium">
                [ Min Price ]
              </span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    const step = minPrice > 0 ? minPrice * 0.05 : (currentPrice > 0 ? currentPrice * 0.05 : 0.01);
                    updateMinPrice(Math.max(0, minPrice - step));
                  }}
                  disabled={rangeType === 'full'}
                  className="ui-button ui-button-secondary !min-h-7 !px-2 rounded-[4px] disabled:opacity-0"
                >
                  <Minus size={13} />
                </button>
                <div className="flex flex-col items-center">
                  {rangeType === 'full' ? (
                    <span className="text-2xl text-bone font-mono">0</span>
                  ) : (
                    <input
                      type="text"
                      inputMode="decimal"
                      className="bg-transparent border-none text-2xl text-center w-full focus:ring-0 text-bone outline-none font-mono tracking-tight p-0"
                      value={minPriceInput}
                      onChange={(e) => handleMinPriceInputChange(e.target.value)}
                    />
                  )}
                  <span className="text-[10px] font-mono text-ash mt-0.5">{currentPrice > 0 ? `${(((minPrice - currentPrice) / currentPrice) * 100).toFixed(1)}% offset` : ''}</span>
                </div>
                <button
                  onClick={() => {
                    const step = minPrice > 0 ? minPrice * 0.05 : (currentPrice > 0 ? currentPrice * 0.05 : 0.01);
                    updateMinPrice(minPrice + step);
                  }}
                  disabled={rangeType === 'full'}
                  className="ui-button ui-button-secondary !min-h-7 !px-2 rounded-[4px] disabled:opacity-0"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {/* CENTRAL ANCHOR */}
            <div className="bg-[#121212] border-y md:border-y-0 md:border-x border-[color:var(--border-subtle)] flex flex-col items-center justify-center px-6 py-4 md:py-0">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] tracking-wider text-ash uppercase font-medium">Current Price</span>
                <p className="text-sm text-bone font-mono">{currentPrice > 0 ? (currentPrice < 0.0001 ? currentPrice.toFixed(6) : currentPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })) : '—'}</p>
                <span className="text-[10px] text-ash/60 uppercase font-mono">{t1.symbol}/{t0.symbol}</span>
              </div>
            </div>

            {/* MAX PRICE */}
            <div className={`p-6 flex flex-col items-center justify-center gap-3 transition-all ${rangeType === 'full' ? 'opacity-20' : 'opacity-100'}`}>
              <span className="text-[11px] uppercase tracking-wider text-ash font-medium">
                [ Max Price ]
              </span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    const step = maxPrice > 0 ? maxPrice * 0.05 : (currentPrice > 0 ? currentPrice * 0.05 : 0.01);
                    updateMaxPrice(Math.max(minPrice > 0 ? minPrice * 1.001 : 0.000001, maxPrice - step));
                  }}
                  disabled={rangeType === 'full'}
                  className="ui-button ui-button-secondary !min-h-7 !px-2 rounded-[4px] disabled:opacity-0"
                >
                  <Minus size={13} />
                </button>
                <div className="flex flex-col items-center">
                  {rangeType === 'full' ? (
                    <Infinity size={28} className="text-bone opacity-40 my-1 font-mono" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="bg-transparent border-none text-2xl text-center w-full focus:ring-0 text-bone outline-none font-mono tracking-tight p-0"
                        value={maxPriceInput}
                        onChange={(e) => handleMaxPriceInputChange(e.target.value)}
                      />
                      <span className="text-[10px] font-mono text-ash mt-0.5">{currentPrice > 0 ? `+${(((maxPrice - currentPrice) / currentPrice) * 100).toFixed(1)}% offset` : ''}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    const step = maxPrice > 0 ? maxPrice * 0.05 : (currentPrice > 0 ? currentPrice * 0.05 : 0.01);
                    updateMaxPrice(maxPrice + step);
                  }}
                  disabled={rangeType === 'full'}
                  className="ui-button ui-button-secondary !min-h-7 !px-2 rounded-[4px] disabled:opacity-0"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Step 5: Deposit Amount */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[11px] uppercase tracking-wider text-ash font-medium">Step 5: Deposit Tokens</label>
            <Info size={13} className="text-ash/40" />
          </div>

          <div className="space-y-3">
            <div className="bg-[#151515] border border-[color:var(--border-subtle)] p-4 rounded-[6px] flex flex-col gap-2 focus-within:border-[color:var(--border-hover)] transition-all">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-[11px] uppercase tracking-wider text-ash font-medium">Amount to Deposit</span>
                  <input
                    className="bg-transparent border-none text-2xl p-0 focus:ring-0 text-bone outline-none w-full font-mono"
                    placeholder="0.0"
                    type="text"
                    value={inputAmount}
                    onChange={(e) => calculateAmountsFromAmount0(e.target.value)}
                  />
                </div>
                 <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-2 bg-[#0c0c0c] px-2.5 py-1 rounded-[4px] border border-[color:var(--border-subtle)]">
                     <div className="h-4 w-4 rounded-full overflow-hidden shrink-0">
                       <TokenImage tokenAddress={t0.address} symbol={t0.symbol} className="w-full h-full" alt={t0.symbol} />
                     </div>
                     <span className="text-xs text-bone font-medium">{t0.symbol}</span>
                  </div>
                  <span className="text-[11px] font-mono text-ash">Balance: {balance0}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#151515] border border-[color:var(--border-subtle)] p-4 rounded-[6px] flex flex-col gap-2 opacity-60">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-[11px] uppercase tracking-wider text-ash font-medium">Amount to Deposit (Calculated)</span>
                  <input
                    className="bg-transparent border-none text-2xl p-0 focus:ring-0 text-bone outline-none cursor-not-allowed font-mono"
                    placeholder="0.0"
                    type="text"
                    value={outputAmount}
                    readOnly
                  />
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-2 bg-[#0c0c0c] px-2.5 py-1 rounded-[4px] border border-[color:var(--border-subtle)]">
                     <div className="h-4 w-4 rounded-full overflow-hidden shrink-0">
                       <TokenImage tokenAddress={t1.address} symbol={t1.symbol} className="w-full h-full" alt={t1.symbol} />
                     </div>
                     <span className="text-xs text-bone font-medium">{t1.symbol}</span>
                  </div>
                  <span className="text-[11px] font-mono text-ash">Balance: {balance1}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="pt-2">
          {!isConnected ? (
            <button
              onClick={() => open()}
              className="ui-button ui-button-primary w-full py-3.5 rounded-[6px] text-sm font-medium flex items-center justify-center cursor-pointer"
            >
              Connect Wallet
            </button>
          ) : (
            <button
              disabled={isConfirming || isHookInputInvalid}
              onClick={() => {
                const feeMap: Record<string, string> = {
                  '0.01%': '100',
                  '0.05%': '500',
                  '0.3%': '3000',
                  '1.00%': '10000'
                };
                const rawFee = feeMap[feeTier] || feeTier;
                const tsNum = Math.max(1, Number(tickSpacing) || 60);
                const fullMinTick = Math.ceil(MIN_TICK / tsNum) * tsNum;
                const fullMaxTick = Math.floor(MAX_TICK / tsNum) * tsNum;

                const targetPoolId = poolId || computePoolId({
                  currency0: t0.address,
                  currency1: t1.address,
                  fee: Number(rawFee),
                  tickSpacing: tsNum,
                  hooks
                });

                console.log("Minting position for pool:", targetPoolId, "tickSpacing:", tsNum);

                mintPosition({
                  token0: t0.address || '',
                  token1: t1.address || '',
                  feeTier: rawFee,
                  tickSpacing: String(tsNum),
                  hooks,
                  poolId: targetPoolId,
                  amount0: parseUnits(inputAmount, t0.decimals).toString(),
                  amount1: parseUnits(outputAmount, t1.decimals).toString(),
                  minTick: rangeType === 'full' ? fullMinTick : priceToTick(minPrice, t0.decimals, t1.decimals, tsNum),
                  maxTick: rangeType === 'full' ? fullMaxTick : priceToTick(maxPrice, t0.decimals, t1.decimals, tsNum),
                  sqrtPrice,
                });
              }}
              className={`ui-button ui-button-primary w-full py-3.5 rounded-[6px] text-sm font-medium flex items-center justify-center cursor-pointer ${(isConfirming || isHookInputInvalid) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isConfirming ? 'Minting Position...' : 'Mint Position'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}