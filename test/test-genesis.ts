import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, utils } from "ethers";
import { ethers } from "hardhat";
import { addressZero, deployTestContract } from "./test-utils";

describe("Genesis Contract", () => {
  let contract: Contract;
  let owner: SignerWithAddress;
  let address1: SignerWithAddress;

  beforeEach(async () => {
    contract = await deployTestContract();
    [owner, address1] = await ethers.getSigners();
  });

  // TODO Adjust with real values
  it("Should initialize the Genesis contract", async () => {
    expect(await contract.MAX_SUPPLY()).to.equal(100);
    expect(await contract.PRICE()).to.equal(utils.parseEther("0.0000001"));
    expect(await contract.MAX_PER_MINT()).to.equal(5);
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
    await contract.flipMintActive();
    await expect(
      contract.connect(address1).mint({
        value: ethers.utils.parseEther("0.0000001"),
      }),
    )
      .to.emit(contract, "Transfer")
      .withArgs(addressZero(), address1.address, 1);
  });
});
