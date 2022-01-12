import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';
import { Deployment } from 'hardhat-deploy/types';
import { Genesis, GenesisReveal, GenesisSupply } from '../typechain';
import { constants } from './constants';
import { generateMerkleTree } from './merkle-tree-utils';
import {
  addressZero,
  createRandomWallets,
  deployShuffler,
  deployTestContract,
  generateAirdroppedWallet,
  generateSeed,
} from './test-utils';

describe('Genesis shuffler', function () {
  let contract: Genesis;
  let supplyContract: GenesisSupply;
  let shuffler: GenesisReveal;
  let coordinatorMock: Deployment;
  let owner: SignerWithAddress;
  let funder: SignerWithAddress;
  let oracle: SignerWithAddress;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    owner = signers[9];
    oracle = signers[1];
    funder = signers[2];

    const deployedContracts = await deployTestContract();
    contract = deployedContracts.contract;
    supplyContract = deployedContracts.supplyContract;

    const deployedShufflerContracts = await deployShuffler();
    shuffler = deployedShufflerContracts.shuffler;
    coordinatorMock = deployedShufflerContracts.vrfCoordinator;
  });

  // To make sure the test dont fail due to timeout
  this.timeout(5000000);

  it('Testing shuffle of complete mint with a +1 shift', async function () {
    const mintersCount = 672;
    const airdropCount = 400;
    const airdropAmmountCount = 1;
    const airdropLoopCount = 25;
    const shiftedSupply = constants.totalSupply - constants.reservedGodsCount;

    // console.log('Generating the random wallets...');
    // // 981 addresses because 10 tokens are reserved for gods and 10 for free minters (with 2 each)
    // // We create a 971 addresses to test minting all the supply and making sure we do in fact run out of supply
    // const minterWallets: Wallet[] = await createRandomWallets(
    //   mintersCount,
    //   funder,
    // );
    // const { treeRoot, proofs } = generateMerkleTree(
    //   minterWallets.map((wallet) => wallet.address),
    // );

    // // Add free minters
    // const airdropWallets: Wallet[] = await createRandomWallets(
    //   airdropCount,
    //   funder,
    // );
    // expect(await contract.totalSupply()).to.be.equal(
    //   constants.reservedGodsCount,
    // );

    // console.log('Random wallets generated');
    // console.log('Starting the mint process...');
    // await contract.connect(owner).unpause();
    // await contract.connect(owner).setWhiteListMerkleTreeRoot(treeRoot);
    // await supplyContract.connect(owner).setGenesis(contract.address);
    // console.log('Minting reserve...');

    // const multipleFreeMintTx = await contract
    //   .connect(owner)
    //   .mintReservedGods(constants.reservedGodsCount);
    // const multipleFreeMintReceipt = await multipleFreeMintTx.wait();
    // let freeMintIndex = 0;
    // for (const event of multipleFreeMintReceipt.events || []) {
    //   if (event.event === 'Transfer') {
    //     expect(event.args![2].toNumber()).to.equal(freeMintIndex);
    //     freeMintIndex++;
    //   }
    // }

    // console.log('Airdropping...');
    // for (let i = 0; i < airdropCount; i += airdropLoopCount) {
    //   // Generate airdrop call data
    //   const walletsToAirdrop = airdropWallets.slice(i, i + airdropLoopCount);

    //   const airdropObjects = await generateAirdroppedWallet(
    //     walletsToAirdrop,
    //     airdropAmmountCount,
    //   );
    //   const airdropTx = await contract.connect(owner).airdrop(airdropObjects);

    //   const airdropReceipts = await airdropTx.wait();
    //   let airdropIndex = constants.reservedGodsCount + i;
    //   for (const event of airdropReceipts.events || []) {
    //     if (event.event === 'Transfer') {
    //       expect(event.args![2].toNumber()).to.equal(airdropIndex);
    //       airdropIndex++;
    //     }
    //   }
    //   expect(await contract.totalSupply()).to.be.equal(
    //     constants.reservedGodsCount + (i + airdropLoopCount),
    //   );
    // }
    // console.log('Activating contract');
    // await contract.connect(owner).setMintState(1);

    // console.log('Minting whitelists...');
    // for (let i = 0; i < mintersCount - 1; i++) {
    //   await expect(
    //     contract
    //       .connect(minterWallets[i])
    //       .mintWhitelist(
    //         proofs[minterWallets[i].address].nonce,
    //         proofs[minterWallets[i].address].proof,
    //         {
    //           value: ethers.utils.parseEther(constants.mintPrice),
    //         },
    //       ),
    //   )
    //     .to.emit(contract, 'Transfer')
    //     // 6 reserved, 20 free mints
    //     .withArgs(
    //       addressZero,
    //       minterWallets[i].address,
    //       i + constants.reservedGodsCount + airdropCount * airdropAmmountCount,
    //     );
    // }
    expect(await contract.totalSupply()).to.be.equal(constants.totalSupply);

    console.log('Setting contract to maintenance and initializing Shuffler');
    // await contract.connect(owner).setMintState(2);
    await contract.connect(owner).setBaseURI(constants.revealedURI);
    const randomNumber = Math.floor(Math.random() * 1234567890);
    // Use shifted supply + 1 to shift of a value of 1
    await generateSeed(
      shuffler,
      owner,
      oracle,
      coordinatorMock.address,
      randomNumber,
    );
    // Match shift from contract
    const indexShift =
      randomNumber % shiftedSupply === 0 ? 1 : randomNumber % shiftedSupply;
    console.log(`Index shift is ${indexShift}`);
    let metadata;
    let trueMetadata;
    let shuffledMetadata;
    let sameTypes = 0;
    for (let i = 0; i < constants.totalSupply; i++) {
      const shiftedIndex =
        ((i + indexShift) % shiftedSupply) + constants.reservedGodsCount;
      metadata = await supplyContract.getMetadataForTokenId(i);
      // We shift of one, so real data is just the next one
      // On last value, it will come back to reservedCount
      trueMetadata = await supplyContract.getMetadataForTokenId(shiftedIndex);
      shuffledMetadata = await shuffler.getMetadataForTokenId(i);

      // Add test for six first
      if (i >= constants.reservedGodsCount) {
        expect(shuffledMetadata[0]).to.be.equal(trueMetadata[0]);
        expect(shuffledMetadata[1]).to.be.equal(trueMetadata[1]);
      } else {
        // First six gods are the same
        expect(shuffledMetadata[0]).to.be.equal(metadata[0]);
        expect(shuffledMetadata[1]).to.be.equal(metadata[1]);
      }
      if (
        shuffledMetadata[0] === metadata[0] &&
        shuffledMetadata[1] === metadata[1]
      ) {
        sameTypes++;
      }
    }
    console.log(
      `Shift where new collection has ${
        (sameTypes / constants.totalSupply) * 100
      }% same type`,
    );
  });
});
