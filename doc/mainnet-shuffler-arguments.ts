import { networkConfig } from '../helper-hardhat-config';

module.exports = [
  '0xF34eFCd569f41c0313A87BD19ac34073cAEEE9c2',
  networkConfig[1].vrfCoordinator,
  networkConfig[1].linkToken,
  networkConfig[1].keyHash,
  networkConfig[1].chainlinkFee,
];
