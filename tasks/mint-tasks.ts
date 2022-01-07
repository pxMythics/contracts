import '@nomiclabs/hardhat-web3';
import { ContractReceipt } from 'ethers';
import { subtask, task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { constants } from '../test/constants';

// TODO: Clean this
// export const livePrepareForMint = task(
//   'live-prepare-mint',
//   'Prepare live contracts for minting',
// )
//   .addParam('genesisaddress', "The Genesis's address")
//   .addParam('genesissupplyaddress', "The GenesisSupply's address")
//   .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
//     const { ethers } = hre;
//     const genesisContract = await ethers.getContractAt(
//       'Genesis',
//       taskArgs.genesisaddress,
//     );
//     const supplyContract = await ethers.getContractAt(
//       'GenesisSupply',
//       taskArgs.genesissupplyaddress,
//     );
//     const signers = await ethers.getSigners();
//     const owner = signers[0];
//     console.log('unpausing...');
//     await genesisContract.connect(owner).unpause();
//     console.log('setting genesis role...');
//     await supplyContract
//       .connect(owner)
//       .grantRole(constants.genesisRole, taskArgs.genesisaddress);
//     console.log('generating seed...');
//     await supplyContract.connect(owner).generateSeed();
//   });

// export const prepareForMint = task(
//   'prepare-mint',
//   'Prepare contracts for minting',
// )
//   .addParam('genesisaddress', "The Genesis's address")
//   .addParam('genesissupplyaddress', "The GenesisSupply's address")
//   .addParam('coordinatormockaddress', "The VRFCoordinatorMock's address")
//   .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
//     await hre.run('pause', {
//       genesisaddress: taskArgs.genesisaddress,
//       pause: 'false',
//     });
//     await hre.run('grant-genesis-role', {
//       genesisaddress: taskArgs.genesisaddress,
//       genesissupplyaddress: taskArgs.genesissupplyaddress,
//     });
//     await hre.run('generate-seed', {
//       genesissupplyaddress: taskArgs.genesissupplyaddress,
//       coordinatormockaddress: taskArgs.coordinatormockaddress,
//     });
//   });

// export const setPauseStateTask = task('pause', 'Pause or Unpause contract')
//   .addParam('genesisaddress', "The Genesis's address")
//   .addParam('pause', 'If true, pause contract, else unpause')
//   .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
//     const { ethers } = hre;
//     const genesisContract = await ethers.getContractAt(
//       'Genesis',
//       taskArgs.genesisaddress,
//     );
//     const signers = await ethers.getSigners();
//     const owner = signers[9];
//     taskArgs.pause === 'true'
//       ? await genesisContract.connect(owner).pause()
//       : await genesisContract.connect(owner).unpause();
//   });

// export const addFreeMint = task(
//   'add-free-mint-address',
//   'Add free minter to contract',
// )
//   .addParam('genesisaddress', "The Genesis's address")
//   .addParam('freeminteraddress', 'Free minter address')
//   .addParam('maxcount', 'Free minter max mint count')
//   .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
//     const { ethers } = hre;
//     const genesisContract = await ethers.getContractAt(
//       'Genesis',
//       taskArgs.genesisaddress,
//     );
//     const signers = await ethers.getSigners();
//     const owner = signers[9];
//     await genesisContract
//       .connect(owner)
//       .addFreeMinter(taskArgs.freeminteraddress, taskArgs.maxcount);
//   });

// export const setWhiteListMerkleTreeRoot = task(
//   'set-whitelist-merkle-tree-root',
//   'Set merkle tree root for whitelist',
// )
//   .addParam('genesisaddress', "The Genesis's address")
//   .addParam('merkletreeroot', 'Merkle Tree root')
//   .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
//     const { ethers } = hre;
//     const genesisContract = await ethers.getContractAt(
//       'Genesis',
//       taskArgs.genesisaddress,
//     );
//     const signers = await ethers.getSigners();
//     const owner = signers[9];
//     await genesisContract
//       .connect(owner)
//       .setWhiteListMerkleTreeRoot(taskArgs.merkletreeroot);
//   });

// export const grantGenesisRole = subtask(
//   'grant-genesis-role',
//   'Grant Genesis contract role for GenesisSupply',
// )
//   .addParam('genesisaddress', "The Genesis's address")
//   .addParam('genesissupplyaddress', "The GenesisSupply's address")
//   .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
//     const { ethers } = hre;
//     const signers = await ethers.getSigners();
//     const owner = signers[9];
//     const supplyContract = await ethers.getContractAt(
//       'GenesisSupply',
//       taskArgs.genesissupplyaddress,
//     );

//     await supplyContract
//       .connect(owner)
//       .grantRole(constants.genesisRole, taskArgs.genesisaddress);
//   });

// export const generateSeed = subtask(
//   'generate-seed',
//   'Generate seed for the supply contract',
// )
//   .addParam('genesissupplyaddress', "The GenesisSupply's address")
//   .addParam('coordinatormockaddress', "The VRFCoordinatorMock's address")
//   .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
//     const { ethers } = hre;
//     const signers = await ethers.getSigners();
//     const owner = signers[9];
//     const supplyContract = await ethers.getContractAt(
//       'GenesisSupply',
//       taskArgs.genesissupplyaddress,
//     );
//     const randomizationTx = await supplyContract.connect(owner).generateSeed();
//     const randomizationReceipt: ContractReceipt = await randomizationTx.wait();
//     const requestId = randomizationReceipt.events?.find(
//       (x: any) => x.event === 'RequestedRandomNumber',
//     )?.args![0];
//     const vrfCoordinatorMock = await ethers.getContractAt(
//       'VRFCoordinatorMock',
//       taskArgs.coordinatormockaddress,
//     );

//     await vrfCoordinatorMock.callBackWithRandomness(
//       requestId,
//       10,
//       supplyContract.address,
//     );
//   });
