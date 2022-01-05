import { networkConfig } from '../helper-hardhat-config';

module.exports = [
  networkConfig[1].unrevealedURI,
  networkConfig[1].mintPrice,
  networkConfig[1].openSeaProxyAddress,
];
