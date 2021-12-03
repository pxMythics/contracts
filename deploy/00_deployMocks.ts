import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployMocks: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment,
) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();
  if (chainId === "31337") {
    log(`Deploying chainlink mocks to chainId: ${chainId}`);
    const linkToken = await deploy("LinkToken", {
      from: deployer,
      args: [],
      log: true,
    });
    await deploy("VRFCoordinatorMock", {
      from: deployer,
      log: true,
      args: [linkToken.address],
    });
    log("Chainlink mocks deployed ");
  }
};
export default deployMocks;

deployMocks.tags = ["all", "mocks"];
