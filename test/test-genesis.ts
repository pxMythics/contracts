import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, utils } from "ethers";
import { ethers } from "hardhat";
import { Deployment } from "hardhat-deploy/dist/types";
import {
  addLinkFundIfNeeded,
  addressZero,
  deployTestContract,
  mint,
} from "./test-utils";

describe("Genesis Contract", () => {
  let contract: Contract;
  let VRFCoordinatorMock: Deployment;
  let owner: SignerWithAddress;
  let address1: SignerWithAddress;
  let oracle: SignerWithAddress;
  const randomNumber = 777;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    owner = signers[9];
    address1 = signers[0];
    oracle = signers[1];
    const deployedContracts = await deployTestContract();
    contract = deployedContracts.contract;
    VRFCoordinatorMock = deployedContracts.vrfCoordinator;
    // TODO: Perhaps this should be only applied on test where it is needed cause it creates a transaction each time
    await addLinkFundIfNeeded(contract, owner);
  });

  // TODO Adjust with real values
  it("Should initialize the Genesis contract", async () => {
    expect(await contract.MAX_SUPPLY()).to.equal(1000);
    expect(await contract.PRICE()).to.equal(utils.parseEther("0.0000001"));
    expect(await contract.MAX_PER_MINT()).to.equal(1);
    expect(await contract.presaleActive()).to.be.false;
    expect(await contract.mintActive()).to.be.false;
    expect(await contract.reservesMinted()).to.be.false;
  });

  it("Should set the right owner", async () => {
    expect(await contract.owner()).to.equal(await owner.address);
  });

  it("Should not allow minting if it is not active", async function () {
    await expect(contract.connect(address1).mint()).to.be.revertedWith(
      "Minting is not active yet!",
    );
    await expect(contract.connect(owner).mintNFTs(5)).to.be.revertedWith(
      "Minting is not active yet!",
    );
  });

  it("Should allow minting if it is active", async function () {
    await contract.connect(owner).flipMintActive();
    expect(await contract.mintActive()).to.be.true;

    const mintTx = await contract.connect(address1).mint({
      value: ethers.utils.parseEther("0.0000001"),
    });
    const mintReceipt = await mintTx.wait();
    const requestId = mintReceipt.events?.find(
      (x: any) => x.event === "RequestedRandomNFT",
    ).args[0];

    const vrfCoordinatorMock = await ethers.getContractAt(
      "VRFCoordinatorMock",
      VRFCoordinatorMock.address,
      oracle,
    );

    await expect(
      vrfCoordinatorMock.callBackWithRandomness(
        requestId,
        randomNumber,
        contract.address,
      ),
    )
      .to.emit(contract, "Transfer")
      .withArgs(addressZero(), address1.address, 1);
  });

  it("Cannot mint more than the max mint per account", async function () {
    await contract.connect(owner).flipMintActive();
    expect(await contract.mintActive()).to.be.true;

    await mint(address1, contract, oracle, VRFCoordinatorMock.address);
    await expect(
      contract.connect(address1).mint({
        value: ethers.utils.parseEther("0.0000001"),
      }),
    ).to.be.revertedWith("No more minting spot left");
  });
});
