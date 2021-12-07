/* eslint-disable node/no-unpublished-import */
import { HardhatRuntimeEnvironment } from "hardhat/types";
// eslint-disable-next-line node/no-missing-import
import { DeployFunction } from "hardhat-deploy/types";
import { Deployment } from "hardhat-deploy/dist/types";
import { networkConfig } from "../helper-hardhat-config";
import { ethers } from "hardhat";
import { LinkToken } from "../typechain";

const deployRaffle: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment,
) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployerSigner = await ethers.getSigner(deployer);
  const chainId = await getChainId();

  console.log(`Deploying Genesis on ${chainId}`);

  const linkToken = await get("LinkToken");
  const VRFCoordinatorMock = await get("VRFCoordinatorMock");
  const linkTokenAddress = linkToken.address;
  const vrfCoordinatorAddress = VRFCoordinatorMock.address;
  const keyHash: string = networkConfig[chainId].keyHash;

  const genesis = await deploy("Genesis", {
    from: deployer,
    args: [
      vrfCoordinatorAddress,
      linkTokenAddress,
      keyHash,
      "ipfs://QmUygfragP8UmCa7aq19AHLttxiLw1ELnqcsQQpM5crgTF/",
    ],
    log: true,
  });
  const LinkContract = await ethers.getContractFactory(
    "LinkToken",
    deployerSigner,
  );

  const link = (await LinkContract.attach(linkToken.address)) as LinkToken;
  const receipt = await link.transfer(
    genesis.address,
    "10000000000000000000000000",
  );
  await receipt.wait();
  log(`Genesis (${genesis.address}) funded with LINK`);
  const balance = await link.balanceOf(genesis.address);
  log(`Genesis LINK balance: ${balance}`);
  const accounts = await ethers.getSigners();
  const balancePlayer = await link.balanceOf(accounts[0].address);
  log(`Player LINK balance ${balancePlayer}`);
};
export default deployRaffle;
deployRaffle.tags = ["all", "raffle"];
