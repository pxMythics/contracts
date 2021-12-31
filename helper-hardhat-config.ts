export interface networkConfigItem {
  name: string;
  chainlinkFee: string;
  mintPrice: string;
  keyHash: string;
  unrevealedURI: string;
  linkToken?: string;
  vrfCoordinator?: string;
}

export interface networkConfigInfo {
  [key: string]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
  default: {
    name: 'hardhat',
    chainlinkFee: '100000000000000000',
    keyHash:
      '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4',
    mintPrice: '77000000000000000',
    unrevealedURI: 'ipfs://QmeZ9zGtFszp9q3fcK7MSoussjm4nBqR8xbQ1z8oDcGDYa',
  },
  31337: {
    name: 'localhost',
    chainlinkFee: '100000000000000000',
    keyHash:
      '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4',
    mintPrice: '77000000000000000',
    unrevealedURI: 'ipfs://QmeZ9zGtFszp9q3fcK7MSoussjm4nBqR8xbQ1z8oDcGDYa',
  },
  42: {
    name: 'kovan',
    linkToken: '0xa36085F69e2889c224210F603D836748e7dC0088',
    keyHash:
      '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4',
    vrfCoordinator: '0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9',
    chainlinkFee: '2000000000000000000',
    mintPrice: '77000000000000000',
    unrevealedURI: 'ipfs://QmeZ9zGtFszp9q3fcK7MSoussjm4nBqR8xbQ1z8oDcGDYa',
  },
  1: {
    name: 'mainnet',
    linkToken: '0x514910771af9ca656af840dff83e8264ecf986ca',
    keyHash:
      '0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445',
    vrfCoordinator: '0xf0d54349aDdcf704F77AE15b96510dEA15cb7952',
    chainlinkFee: '100000000000000000',
    mintPrice: '77000000000000000',
    // TODO: Update with final unrevealed file
    unrevealedURI: 'ipfs://QmeZ9zGtFszp9q3fcK7MSoussjm4nBqR8xbQ1z8oDcGDYa',
  },
  4: {
    name: 'rinkeby',
    linkToken: '0x01BE23585060835E02B77ef475b0Cc51aA1e0709',
    keyHash:
      '0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311',
    vrfCoordinator: '0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B',
    chainlinkFee: '100000000000000000',
    mintPrice: '77000000000000000',
    unrevealedURI: 'ipfs://QmeZ9zGtFszp9q3fcK7MSoussjm4nBqR8xbQ1z8oDcGDYa',
  },
};

export const developmentChains = ['hardhat', 'localhost'];
