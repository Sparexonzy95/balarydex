export const USDC_ADDRESS = "0xD88cA23473DF0fAf9FCDE8d6880f4c8b88df69A5";

export const POOLMANAGER_ADDRESS = "0xA46Fb600d828E3D6aA91581Ca4D4956E9D5c7aba";
export const V4_QUOTER_ADDRESS = "0xdCb8e637cFef33c308A756aDf40b944F943db99E";
export const PERMIT2_ADDRESS = "0x8F17F13156511B368115125F327FfA7335778746";
export const WETH_ADDRESS = "0xBf55DF8919852bA1A148EF8e7BC0980cFC987F77";
export const POSITION_MANAGER_ADDRESS = "0x47c05770001aa727dFB5717D5bFD9dDd624387A9";
export const STATEVIEW_ADDRESS = "0xc7d465387134B649aF813b7Ab447F54e532ae794";
export const UNIVERSALROUTER_ADDRESS = "0xaA01FFaDBad68411a8eE6b134B3BB8E7BAf078F6";

export const FAUCET_ADDRESS = "0x62e6E1d8e42F804C2691A5CA4e670d9c13d8f261";
export const POINTSHOOK_ADDRESS = "0x7267CD4fF7f0e9Ba3bf1Ec8f1b8A7D14b16C4040";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3102'
    : 'https://api.balary.lol');

export const ADMIN_WALLETS = [
  '0x99Bc52a8aa5931A652620e901BF434DeD949348d'.toLowerCase(),
  '0x4e59b44847b379578588920cA78FbF26c0B4956C'.toLowerCase(),
];

export function isAdminWallet(address?: string | null): boolean {
  if (!address) return false;
  return ADMIN_WALLETS.includes(address.toLowerCase());
}

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
