import { networkConfig } from '../helper-hardhat-config';

module.exports = [
  networkConfig[4].vrfCoordinator,
  networkConfig[4].linkToken,
  networkConfig[4].keyHash,
  networkConfig[4].chainlinkFee,
];
