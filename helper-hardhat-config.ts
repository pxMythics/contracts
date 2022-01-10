export interface networkConfigItem {
  name: string;
  mintPrice: string;
  unrevealedURI: string;
  openSeaProxyAddress: string;
}

export interface networkConfigInfo {
  [key: string]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
  default: {
    name: 'hardhat',
    mintPrice: '77000000000000000',
    unrevealedURI: 'ipfs://QmeZ9zGtFszp9q3fcK7MSoussjm4nBqR8xbQ1z8oDcGDYa/',
    openSeaProxyAddress: '0xf57b2c51ded3a29e6891aba85459d600256cf317',
  },
  31337: {
    name: 'localhost',
    mintPrice: '77000000000000000',
    unrevealedURI: 'ipfs://QmeZ9zGtFszp9q3fcK7MSoussjm4nBqR8xbQ1z8oDcGDYa/',
    openSeaProxyAddress: '0xf57b2c51ded3a29e6891aba85459d600256cf317',
  },
  42: {
    name: 'kovan',
    mintPrice: '77000000000000000',
    unrevealedURI: 'ipfs://QmeZ9zGtFszp9q3fcK7MSoussjm4nBqR8xbQ1z8oDcGDYa/',
    openSeaProxyAddress: '0xf57b2c51ded3a29e6891aba85459d600256cf317',
  },
  1: {
    name: 'mainnet',
    mintPrice: '77000000000000000',
    unrevealedURI: 'ipfs://Qmb4UCSNMuDz5sNk3Ngh2kkBkUzNcrYnNGKckZQ4CrJ2kE/',
    openSeaProxyAddress: '0xa5409ec958c83c3f309868babaca7c86dcb077c1',
  },
  4: {
    name: 'rinkeby',
    mintPrice: '77000000000000000',
    unrevealedURI: 'ipfs://QmeZ9zGtFszp9q3fcK7MSoussjm4nBqR8xbQ1z8oDcGDYa/',
    openSeaProxyAddress: '0xf57b2c51ded3a29e6891aba85459d600256cf317',
  },
};

export const developmentChains = ['hardhat', 'localhost'];
