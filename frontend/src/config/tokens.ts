export interface TokenConfig {
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  logo: string;
}

export const TOKENS: TokenConfig[] = [
  {
    address: "0xa0Cf27f53636529c227845ce16b49AB759dD8cd0",
    name: "Balary",
    symbol: "BAL",
    decimals: 18,
    logo: "/tokens/bal.svg"
  },
  {
    address: "0xD88cA23473DF0fAf9FCDE8d6880f4c8b88df69A5",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    logo: "/assets/0x3600000000000000000000000000000000000000/logo.png"
  },
  {
    address: "0x63647642133bBdF0461bcf7BF6c360e1969B1194",
    name: "Wrapped Litecoin",
    symbol: "WLTC",
    decimals: 18,
    logo: "/tokens/wltc.svg"
  },
  {
    address: "0x6841fdF52E3398DC43cDb042292B0ECb53FA8737",
    name: "SoftDAO",
    symbol: "SOFT",
    decimals: 18,
    logo: "/assets/0x8c277c071D42987Ef7712d135C4da1f46EA8Af8d/logo.png"
  },
  {
    address: "0xA9a29BA9C693Fe87Bb929322DD96728E61f6a1ed",
    name: "MONKE",
    symbol: "MONKE",
    decimals: 18,
    logo: "/assets/0x57700E377d85328322574FB8d92d4F017a2106E2/logo.jpeg"
  }
];
