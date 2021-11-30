import { Contract } from "ethers";
import { ethers } from "hardhat";

export const deployTestContract = async (
  baseURI: string = "ipfs://QmUygfragP8UmCa7aq19AHLttxiLw1ELnqcsQQpM5crgTF/",
): Promise<Contract> => {
  const Genesis = await ethers.getContractFactory("Genesis");
  const genesis = await Genesis.deploy(baseURI);

  return await genesis.deployed();
};

export const addressZero = (): string =>
  "0x0000000000000000000000000000000000000000";
