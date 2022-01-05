import { networkConfig } from '../helper-hardhat-config';

module.exports = [
  networkConfig[1].vrfCoordinator,
  networkConfig[1].linkToken,
  networkConfig[1].keyHash,
  networkConfig[1].chainlinkFee,
];
