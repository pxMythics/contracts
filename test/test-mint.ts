import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { Deployment } from "hardhat-deploy/dist/types";
import {
  addressZero,
  deployTestContract,
  addLinkFundIfNeeded,
} from "./test-utils";
import fs from "fs";

describe("Genesis full minting function", function () {
  let contract: Contract;
  let VRFCoordinatorMock: Deployment;
  let owner: SignerWithAddress;
  let address1: SignerWithAddress;
  let oracle: SignerWithAddress;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    owner = signers[9];
    address1 = signers[0];
    oracle = signers[1];
    const deployedContracts = await deployTestContract(owner);
    contract = deployedContracts.contract;
    VRFCoordinatorMock = deployedContracts.vrfCoordinator;
    // TODO: Perhaps this should be only applied on test where it is needed cause it creates a transaction each time
    await addLinkFundIfNeeded(contract, owner);
  });

  this.timeout(5000000);

  it("Testing complete mint", async function () {
    await contract.connect(owner).flipMintActive();
    expect(await contract.mintActive()).to.be.true;
    const writeStream = fs.createWriteStream(
      "./doc/minting-distribution-tests.csv",
      { flags: "a" },
    );
    writeStream.write(`Run #5\n`);
    for (let i = 0; i < 1000; i++) {
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
          Math.floor(Math.random() * 100000),
          contract.address,
        ),
      )
        .to.emit(contract, "Transfer")
        .withArgs(addressZero(), address1.address, (i + 1).toString());

      const tokenType = await contract.tokenIdToTokenType(i + 1);
      writeStream.write(`${i + 1},${tokenType}\n`);
    }
    writeStream.write("\n");
    writeStream.end();
  });
});
