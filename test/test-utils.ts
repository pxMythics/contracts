import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, ContractReceipt } from "ethers";
import { deployments, ethers, getChainId } from "hardhat";
import { Deployment } from "hardhat-deploy/dist/types";
import { networkConfig } from "../helper-hardhat-config";
import { LinkToken } from "../typechain";

/**
 * Deploy the test contract. We use this function to ensure that the contract is brand new after each test
 * @param deployer The signer to deploy the contract
 * @param baseURI The base URI for the contract
 * @returns The Genesis contract, the LinkToken contract and the vrfCoordinator contract.
 */
export const deployTestContract = async (
  deployer: SignerWithAddress,
  baseURI: string = "ipfs://QmUygfragP8UmCa7aq19AHLttxiLw1ELnqcsQQpM5crgTF/",
): Promise<{
  contract: Contract;
  linkToken: Deployment;
  vrfCoordinator: Deployment;
}> => {
  // Redeploying the contract at each run to avoid the values being messed up
  const chainId = await getChainId();
  const linkToken = await deployments.get("LinkToken");
  const VRFCoordinatorMock = await deployments.get("VRFCoordinatorMock");
  const linkTokenAddress = linkToken.address;
  const vrfCoordinatorAddress = VRFCoordinatorMock.address;
  const keyHash: string = networkConfig[chainId].keyHash;

  const Genesis = await ethers.getContractFactory("Genesis");
  const genesis = await Genesis.connect(deployer).deploy(
    vrfCoordinatorAddress,
    linkTokenAddress,
    keyHash,
    "ipfs://QmUygfragP8UmCa7aq19AHLttxiLw1ELnqcsQQpM5crgTF/",
  );
  return {
    contract: genesis,
    linkToken: linkToken,
    vrfCoordinator: VRFCoordinatorMock,
  };
};

/**
 *  Checks if the contract has enough $LINK and fund it otherwise
 * @param genesis The contract to fund
 * @param deployer The deployer of the contract
 */
export const addLinkFundIfNeeded = async (
  genesis: Contract,
  deployer: SignerWithAddress,
) => {
  const linkToken = await deployments.get("LinkToken");
  const LinkContract = await ethers.getContractFactory("LinkToken", deployer);
  const link = (await LinkContract.attach(linkToken.address)) as LinkToken;

  const balance = await link.balanceOf(genesis.address);
  if (balance.lte(0)) {
    console.log("Will add funds to genesis");
    const receipt = await link.transfer(
      genesis.address,
      "1000000000000000000000000000000",
    );
    await receipt.wait();
    console.log("added funds to genesis");
  }
};

export const addressZero = (): string =>
  "0x0000000000000000000000000000000000000000";

/**
 * Minting function, use only if you don't need to test the minting flow.
 * @param minter The signer that mints
 * @param contract The Genesis contract
 * @param oracle The oracle
 * @param coordinatorMockAddress The coordinator mock address
 */
export const mint = async (
  minter: SignerWithAddress,
  contract: Contract,
  oracle: SignerWithAddress,
  coordinatorMockAddress: string,
) => {
  const mintTx = await contract.connect(minter).mint({
    value: ethers.utils.parseEther("0.0000001"),
  });
  const mintReceipt: ContractReceipt = await mintTx.wait();
  const requestId = mintReceipt.events?.find(
    (x: any) => x.event === "RequestedRandomNFT",
  )?.args![0];

  const vrfCoordinatorMock = await ethers.getContractAt(
    "VRFCoordinatorMock",
    coordinatorMockAddress,
    oracle,
  );

  await vrfCoordinatorMock.callBackWithRandomness(
    requestId,
    Math.floor(Math.random() * 100000),
    contract.address,
  );
};
