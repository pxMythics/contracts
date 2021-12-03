import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployments, ethers } from "hardhat";
import { Deployment } from "hardhat-deploy/dist/types";
import { Contract } from "ethers";

export const deployTestContract = async (
  baseURI: string = "ipfs://QmUygfragP8UmCa7aq19AHLttxiLw1ELnqcsQQpM5crgTF/",
): Promise<{
  contract: Contract;
  linkToken: Deployment;
  vrfCoordinator: Deployment;
}> => {
  let owner: SignerWithAddress;
  const LinkToken: Deployment = await deployments.get("LinkToken");
  const VRFCoordinatorMock: Deployment = await deployments.get(
    "VRFCoordinatorMock",
  );

  await deployments.fixture(["Genesis"]);
  const GenesisDeployment: Deployment = await deployments.get("Genesis");
  [owner] = await ethers.getSigners();
  const Genesis = await ethers.getContractAt(
    "Genesis",
    GenesisDeployment.address,
    owner,
  );

  return {
    contract: Genesis,
    linkToken: LinkToken,
    vrfCoordinator: VRFCoordinatorMock,
  };
};

export const addressZero = (): string =>
  "0x0000000000000000000000000000000000000000";
