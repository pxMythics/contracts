import '@nomiclabs/hardhat-web3';
import { ContractReceipt } from 'ethers';
import { subtask, task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { constants } from '../test/constants';
import airdrop1 from './data/airdrop-2.json';

const genesisAddress = '0x12c63bbD266dB84e117356e664f3604055166CEc';
const supplyAddress = '0x4D6A46de0a003147a1e0E7b4f87C33CAFADF7AE0';

export const prepareContract = task(
  'prepare-contract',
  'Prepare contract',
).setAction(async (_taskArgs, hre: HardhatRuntimeEnvironment) => {
  const { ethers } = hre;
  const signers = await ethers.getSigners();
  const owner = signers[0];
  const genesisContract = await ethers.getContractAt('Genesis', genesisAddress);
  const supplyContract = await ethers.getContractAt(
    'GenesisSupply',
    supplyAddress,
  );
  await genesisContract.connect(owner).unpause();
  await supplyContract.connect(owner).setGenesis(genesisContract.address);
});

export const mintReservedGods = task(
  'mint-reserved',
  'Mint reserved gods',
).setAction(async (_taskArgs, hre: HardhatRuntimeEnvironment) => {
  const { ethers } = hre;
  const signers = await ethers.getSigners();
  const owner = signers[0];
  const genesisContract = await ethers.getContractAt('Genesis', genesisAddress);
  await genesisContract.connect(owner).mintReservedGods(6);
});

export const airdropTeam = task('airdrop-team', 'Airdrop to team member')
  .addParam('start', 'starting index')
  .addParam('end', 'ending index')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const signers = await ethers.getSigners();
    const owner = signers[0];
    const startIndex = taskArgs.start;
    const endIndex = taskArgs.end;
    const genesisContract = await ethers.getContractAt(
      'Genesis',
      genesisAddress,
    );
    // await genesisContract
    //   .connect(owner)
    //   .airdrop(teamAirdrop.slice(startIndex, endIndex), { gasPrice: 2500000 });
  });

export const airdrop = task('airdrop', 'Airdrop free mints')
  // .addParam('start', 'starting index')
  // .addParam('end', 'ending index')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const signers = await ethers.getSigners();
    const owner = signers[0];
    // const startIndex = taskArgs.start;
    // const endIndex = taskArgs.end;
    const genesisContract = await ethers.getContractAt(
      'Genesis',
      genesisAddress,
    );
    await genesisContract.connect(owner).airdrop(airdrop1, {
      // .airdrop(airdrop1.slice(startIndex, endIndex), {
      gasLimit: 3500000,
    });
  });

export const prepareForMint = task('prepare-mint', 'Prepare contract for mint')
  .addParam('merkletreeroot', 'Merkle tree root')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const signers = await ethers.getSigners();
    const owner = signers[0];
    const genesisContract = await ethers.getContractAt(
      'Genesis',
      genesisAddress,
    );
    await hre.run('merkletreeroot', {
      merkletreeroot: taskArgs.merkletreeroot,
    });
    await genesisContract.connect(owner).setMintState(1);
  });

export const setMerkleTreeRoot = task(
  'set-tree-root',
  'Set the Whitelist Merkle Tree Root',
)
  .addParam('merkletreeroot', 'Merkle tree root')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const signers = await ethers.getSigners();
    const owner = signers[0];
    const genesisContract = await ethers.getContractAt(
      'Genesis',
      genesisAddress,
    );
    await genesisContract
      .connect(owner)
      .setWhiteListMerkleTreeRoot(taskArgs.merkletreeroot);
  });
