import { ethers } from 'ethers';

// TODO This should also be fetched from the contract
export const constants = {
  unrevealedURI: 'ipfs://QmUygfragP8UmCa7aq19AHLttxiLw1ELnqcsQQpM5crgTF/',
  revealedURI:
    'ipfs://QmUygfragP8UmCa7aq19AHLttxiLw1ELnqcsQQpM5crgTF/revealed/',
  genesisRole: ethers.utils.id('GENESIS_ROLE'),
  backendRole: ethers.utils.id('BACKEND_ROLE'),
};
