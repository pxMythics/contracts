import { networkConfig } from '../helper-hardhat-config';

module.exports = [
  '0x4D6A46de0a003147a1e0E7b4f87C33CAFADF7AE0',
  networkConfig[4].vrfCoordinator,
  networkConfig[4].linkToken,
  networkConfig[4].keyHash,
  networkConfig[4].chainlinkFee,
];
