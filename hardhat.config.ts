import '@typechain/hardhat';
import '@nomiclabs/hardhat-waffle';
import 'hardhat-gas-reporter';
import '@nomiclabs/hardhat-web3';
import '@nomiclabs/hardhat-etherscan';
import dotenv from 'dotenv';
import 'hardhat-deploy';
import 'hardhat-ethernal';
import 'hardhat-tracer';
import 'hardhat-log-remover';
import 'hardhat-contract-sizer';
import 'hardhat-abi-exporter';
import './tasks/mint-tasks';

dotenv.config();
const {
  MAINNET_PRIVATE_KEY,
  RINKEBY_PRIVATE_KEY,
  MAINNET_API_URL,
  RINKEBY_API_URL,
  ETHERSCAN_API_KEY,
  REPORT_GAS,
} = process.env;

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

// TODO Adjust for real deployment
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.7',
      },
      {
        version: '0.6.6',
      },
      {
        version: '0.4.24',
      },
    ],
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
  networks: {
    rinkeby: {
      url: RINKEBY_API_URL,
      accounts: [RINKEBY_PRIVATE_KEY],
    },
    mainnet: {
      url: MAINNET_API_URL,
      accounts: [MAINNET_PRIVATE_KEY],
    },
  },
  gasReporter: {
    enabled: !!REPORT_GAS,
    currency: 'USD',
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  namedAccounts: {
    deployer: {
      default: 9,
      1: 9,
      rinkeby: 0,
      mainnet: 0,
    },
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
};
