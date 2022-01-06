import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';
import { Deployment } from 'hardhat-deploy/dist/types';
import { Genesis, GenesisSupply } from '../typechain';
import { constants } from './constants';
import { generateMerkleTree } from './merkle-tree-utils';
import {
  addressZero,
  createRandomWallets,
  deployTestContract,
  generateSeed,
} from './test-utils';

describe('Genesis full minting function', function () {
  let contract: Genesis;
  let supplyContract: GenesisSupply;
  let VRFCoordinatorMock: Deployment;
  let owner: SignerWithAddress;
  let oracle: SignerWithAddress;
  let funder: SignerWithAddress;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    owner = signers[9];
    oracle = signers[1];
    funder = signers[2];
    const deployedContracts = await deployTestContract();
    contract = deployedContracts.contract;
    supplyContract = deployedContracts.supplyContract;
    VRFCoordinatorMock = deployedContracts.vrfCoordinator;
    await contract.connect(owner).unpause();
  });

  // To make sure the test dont fail due to timeout
  this.timeout(5000000);

  it('Testing complete mint', async function () {
    console.log('Generating the random wallets...');
    const totalWallet = 6;
    const freeMintCount = 15;
    const freeMinterCount = 66;
    // 981 addresses because 10 tokens are reserved for gods and 10 for free minters (with 2 each)
    // We create a 971 addresses to test minting all the supply and making sure we do in fact run out of supply
    const minterWallets: Wallet[] = await createRandomWallets(
      totalWallet,
      funder,
    );
    const { treeRoot, proofs } = generateMerkleTree(
      minterWallets.map((wallet) => wallet.address),
    );

    // Add free minters
    const freeMinterWallets: Wallet[] = await createRandomWallets(
      freeMinterCount,
      funder,
    );
    expect(await contract.totalSupply()).to.be.equal(
      constants.reservedGodsCount,
    );

    console.log('Random wallets generated');
    console.log('Starting the mint process...');
    await contract.connect(owner).setWhiteListMerkleTreeRoot(treeRoot);
    for (let i = 0; i < freeMinterWallets.length; i++) {
      await contract
        .connect(owner)
        .addFreeMinter(freeMinterWallets[i].address, freeMintCount);
    }

    await generateSeed(
      supplyContract,
      owner,
      oracle,
      VRFCoordinatorMock.address,
    );

    console.log('Minting reserve...');
    const multipleFreeMintTx = await contract
      .connect(owner)
      .mintReservedGods(constants.reservedGodsCount);
    const multipleFreeMintReceipt = await multipleFreeMintTx.wait();
    let freeMintIndex = 0;
    for (const event of multipleFreeMintReceipt.events || []) {
      if (event.event === 'Transfer') {
        expect(event.args![2].toNumber()).to.equal(freeMintIndex);
        freeMintIndex++;
      }
    }

    console.log('Minting free mints...');
    for (let i = 0; i < freeMinterCount; i++) {
      const multipleFreeMintTx = await contract
        .connect(freeMinterWallets[i])
        .freeMint(freeMintCount);
      const multipleFreeMintReceipt = await multipleFreeMintTx.wait();
      let freeMintIndex = constants.reservedGodsCount + i * freeMintCount;
      for (const event of multipleFreeMintReceipt.events || []) {
        if (event.event === 'Transfer') {
          expect(event.args![2].toNumber()).to.equal(freeMintIndex);
          freeMintIndex++;
        }
      }
      expect(await contract.totalSupply()).to.be.equal(
        constants.reservedGodsCount + (i + 1) * freeMintCount,
      );
    }

    console.log('Minting whitelists...');
    for (let i = 0; i < totalWallet - 1; i++) {
      await expect(
        contract
          .connect(minterWallets[i])
          .mintWhitelist(
            proofs[minterWallets[i].address].nonce,
            proofs[minterWallets[i].address].proof,
            {
              value: ethers.utils.parseEther(constants.mintPrice),
            },
          ),
      )
        .to.emit(contract, 'Transfer')
        // 6 reserved, 20 free mints
        .withArgs(
          addressZero,
          minterWallets[i].address,
          i + constants.reservedGodsCount + freeMinterCount * freeMintCount,
        );

      expect(await contract.totalSupply()).to.be.equal(
        constants.reservedGodsCount + freeMinterCount * freeMintCount + i + 1,
      );
    }
    expect(await contract.totalSupply()).to.be.equal(1001);
    console.log('Minting over the limit...');
    await expect(
      contract
        .connect(minterWallets[totalWallet - 1])
        .mintWhitelist(
          proofs[minterWallets[totalWallet - 1].address].nonce,
          proofs[minterWallets[totalWallet - 1].address].proof,
          {
            value: ethers.utils.parseEther(constants.mintPrice),
          },
        ),
    ).to.be.revertedWith('Not enough supply');
    expect(await contract.totalSupply()).to.be.equal(1001);

    console.log('Outputting generated collection types');
    let metadata;
    for (let i = 0; i < 1001; i++) {
      metadata = await supplyContract.getMetadataForTokenId(i);
      console.log(`${i}, ${metadata[0]}, ${metadata[1]}`);
    }
  });
});
