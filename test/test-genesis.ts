import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, utils } from "ethers";
import { ethers, getChainId } from "hardhat";
import { Deployment } from "hardhat-deploy/dist/types";
import { addressZero, deployTestContract } from "./test-utils";
import { networkConfig } from "../helper-hardhat-config";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Genesis Contract", () => {
  let contract: Contract;
  let LinkToken: Deployment;
  let VRFCoordinatorMock: Deployment;
  let owner: SignerWithAddress;
  let address1: SignerWithAddress;
  let oracle: SignerWithAddress;
  const randomNumber = 777;

  beforeEach(async () => {
    const deployedContracts = await deployTestContract();
    contract = deployedContracts.contract;
    LinkToken = deployedContracts.linkToken;
    VRFCoordinatorMock = deployedContracts.vrfCoordinator;
    const signers = await ethers.getSigners();
    owner = signers[9];
    address1 = signers[0];
    oracle = signers[1];
    console.log(
      `signers are owner: ${owner.address} address1: ${address1.address}`,
    );
  });

  // TODO Adjust with real values
  it("Should initialize the Genesis contract", async () => {
    expect(await contract.MAX_SUPPLY()).to.equal(100);
    expect(await contract.PRICE()).to.equal(utils.parseEther("0.0000001"));
    expect(await contract.MAX_PER_MINT()).to.equal(2);
    expect(await contract.presaleActive()).to.be.false;
    expect(await contract.mintActive()).to.be.false;
    expect(await contract.reservesMinted()).to.be.false;
  });

  it("Should set the right owner", async () => {
    expect(await contract.owner()).to.equal(await owner.address);
  });

  it("Should not allow minting if it is not active", async function () {
    await expect(contract.mint()).to.be.revertedWith(
      "Minting is not active yet!",
    );
    await expect(contract.mintNFTs(5)).to.be.revertedWith(
      "Minting is not active yet!",
    );
  });

  it("Should allow minting if it is active", async function () {
    await contract.connect(owner).flipMintActive();
    expect(await contract.mintActive()).to.be.true;
    // let upKeepResponse = await contract.checkUpkeep("0x");
    // expect(upKeepResponse[0]).to.equal(false);
    // const chainId = await getChainId();
    // const sleepTime = parseInt(networkConfig[chainId].interval) * 1000;
    // await sleep(sleepTime); // we need to wait out the interval!
    // upKeepResponse = await contract.checkUpkeep("0x");
    // expect(upKeepResponse[0]).to.equal(true);
    const performTx = await contract.performUpkeep("0x");
    const performReceipt = await performTx.wait();

    await contract.connect(address1).mint({
      value: ethers.utils.parseEther("0.0000001"),
    });

    const vrfCoordinatorMock = await ethers.getContractAt(
      "VRFCoordinatorMock",
      VRFCoordinatorMock.address,
      oracle,
    );
    await expect(
      vrfCoordinatorMock.callBackWithRandomness(
        performReceipt.events![2].topics[1],
        randomNumber,
        contract.address,
      ),
    )
      .to.emit(contract, "Transfer")
      .withArgs(addressZero(), address1.address, 1);
  });
});
