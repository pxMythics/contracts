import { deployments } from "hardhat";
import { Deployment } from "hardhat-deploy/dist/types";

export const deployTestContract = async (
  baseURI: string = "ipfs://QmUygfragP8UmCa7aq19AHLttxiLw1ELnqcsQQpM5crgTF/",
): Promise<{
  contract: Deployment;
  linkToken: Deployment;
  vrfCoordinator: Deployment;
}> => {
  const LinkToken: Deployment = await deployments.get("LinkToken");
  const VRFCoordinatorMock: Deployment = await deployments.get(
    "VRFCoordinatorMock",
  );

  const Genesis: Deployment = await deployments.get("Genesis");

  return {
    contract: Genesis,
    linkToken: LinkToken,
    vrfCoordinator: VRFCoordinatorMock,
  };
};

export const addressZero = (): string =>
  "0x0000000000000000000000000000000000000000";
