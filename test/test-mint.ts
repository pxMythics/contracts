import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';
import { Genesis, GenesisSupply } from '../typechain';
import { constants } from './constants';
import { generateMerkleTree } from './merkle-tree-utils';
import {
  addressZero,
  createRandomWallets,
  deployTestContract,
  generateAirdroppedWallet,
} from './test-utils';

describe('Genesis full minting function', function () {
  let contract: Genesis;
  let supplyContract: GenesisSupply;
  let owner: SignerWithAddress;
  let funder: SignerWithAddress;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    owner = signers[9];
    funder = signers[2];
    const deployedContracts = await deployTestContract();
    contract = deployedContracts.contract;
    supplyContract = deployedContracts.supplyContract;
  });

  // To make sure the test dont fail due to timeout
  this.timeout(5000000);

  it('Testing complete mint', async function () {
    console.log('Generating the random wallets...');
    const mintersCount = 672;
    const airdropCount = 400;
    const airdropAmmountCount = 1;
    const airdropLoopCount = 25;
    // 981 addresses because 10 tokens are reserved for gods and 10 for free minters (with 2 each)
    // We create a 971 addresses to test minting all the supply and making sure we do in fact run out of supply
    const minterWallets: Wallet[] = await createRandomWallets(
      mintersCount,
      funder,
    );
    const { treeRoot, proofs } = generateMerkleTree(
      minterWallets.map((wallet) => wallet.address),
    );

    // Add free minters
    const airdropWallets: Wallet[] = await createRandomWallets(
      airdropCount,
      funder,
    );
    expect(await contract.totalSupply()).to.be.equal(
      constants.reservedGodsCount,
    );

    console.log('Random wallets generated');
    console.log('Starting the mint process...');
    await contract.connect(owner).unpause();
    await contract.connect(owner).setWhiteListMerkleTreeRoot(treeRoot);
    await supplyContract.connect(owner).setGenesis(contract.address);
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

    console.log('Airdropping...');
    for (let i = 0; i < airdropCount; i += airdropLoopCount) {
      // Generate airdrop call data
      const walletsToAirdrop = airdropWallets.slice(i, i + airdropLoopCount);

      const airdropObjects = await generateAirdroppedWallet(
        walletsToAirdrop,
        airdropAmmountCount,
      );
      const airdropTx = await contract.connect(owner).airdrop(airdropObjects);

      const airdropReceipts = await airdropTx.wait();
      let airdropIndex = constants.reservedGodsCount + i;
      for (const event of airdropReceipts.events || []) {
        if (event.event === 'Transfer') {
          expect(event.args![2].toNumber()).to.equal(airdropIndex);
          airdropIndex++;
        }
      }
      expect(await contract.totalSupply()).to.be.equal(
        constants.reservedGodsCount + (i + airdropLoopCount),
      );
    }
    console.log('Activating contract');
    await contract.connect(owner).setMintState(1);

    console.log('Minting whitelists...');
    for (let i = 0; i < mintersCount - 1; i++) {
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
          i + constants.reservedGodsCount + airdropCount * airdropAmmountCount,
        );

      expect(await contract.totalSupply()).to.be.equal(
        constants.reservedGodsCount +
          airdropCount * airdropAmmountCount +
          i +
          1,
      );
    }
    expect(await contract.totalSupply()).to.be.equal(constants.totalSupply);
    console.log('Minting over the limit...');
    await expect(
      contract
        .connect(minterWallets[mintersCount - 1])
        .mintWhitelist(
          proofs[minterWallets[mintersCount - 1].address].nonce,
          proofs[minterWallets[mintersCount - 1].address].proof,
          {
            value: ethers.utils.parseEther(constants.mintPrice),
          },
        ),
    ).to.be.revertedWith('Not enough supply');
    expect(await contract.totalSupply()).to.be.equal(constants.totalSupply);

    console.log('Outputting generated collection types');
    await contract.connect(owner).setMintState(2);
    await contract.connect(owner).setBaseURI(constants.revealedURI);
    let metadata;
    for (let i = 0; i < constants.totalSupply; i++) {
      metadata = await supplyContract.getMetadataForTokenId(i);
      console.log(`${i}, ${metadata[0]}, ${metadata[1]}`);
    }
  });
});
