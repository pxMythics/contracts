import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-etherscan";

// TODO Change this to Typescript
require('dotenv').config();
const { API_URL, PRIVATE_KEY, ETHERSCAN_API_KEY, REPORT_GAS } = process.env;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
 // TODO Adjust for real deployment
module.exports = {
  solidity: "0.8.4",
  defaultNetwork: "goerli",
  networks: {
    goerli: {
      url: API_URL,
      accounts: [PRIVATE_KEY]
    }
  },
  gasReporter: {
    enabled: REPORT_GAS ? true : false,
    currency: "USD",
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};