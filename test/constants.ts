import { ethers } from 'ethers';

// TODO This should also be fetched from the contract
export const constants = {
  mintPrice: '0.077',
  unrevealedURI: 'ipfs://QmeZ9zGtFszp9q3fcK7MSoussjm4nBqR8xbQ1z8oDcGDYa',
  revealedURI:
    'ipfs://QmUygfragP8UmCa7aq19AHLttxiLw1ELnqcsQQpM5crgTF/revealed/',
  genesisRole: ethers.utils.id('GENESIS_ROLE'),
};
