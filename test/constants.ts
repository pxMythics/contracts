import { ethers } from 'ethers';

// TODO This should also be fetched from the contract
export const constants = {
  unrevealedURI: 'ipfs://QmUygfragP8UmCa7aq19AHLttxiLw1ELnqcsQQpM5crgTF/',
  revealedURI:
    'ipfs://QmUygfragP8UmCa7aq19AHLttxiLw1ELnqcsQQpM5crgTF/revealed/',
  totalSupply: 1000,
  genesisRole: ethers.utils.id('GENESIS_ROLE'),
};
