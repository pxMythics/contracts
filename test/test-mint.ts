import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { Deployment } from 'hardhat-deploy/dist/types';
import { generateMerkleTree } from './merkle-tree-utils';
import {
  createRandomWallets,
  deployTestContract,
  setupRandomization,
} from './test-utils';

describe('Genesis full minting function', function () {
  let contract: Contract;
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
    VRFCoordinatorMock = deployedContracts.vrfCoordinator;
    await contract.connect(owner).unpause();
    await setupRandomization(
      owner,
      contract,
      oracle,
      VRFCoordinatorMock.address,
    );
  });

  // To make sure the test dont fail due to timeout
  this.timeout(5000000);

  it('Testing complete mint (whitelist only)', async function () {
    console.log('Generating the random wallets...');
    // 981 addresses because 10 tokens are reserved for gods and 10 for free minters (with 2 each)
    // We create a 971 addresses to test minting all the supply and making sure we do in fact run out of supply
    const minterWallets = await createRandomWallets(971, funder);
    const { treeRoot, proofs } = generateMerkleTree(
      minterWallets.map((wallet) => wallet.address),
    );

    // Add free minters
    const freeMinterWallets = await createRandomWallets(10, funder);

    console.log('Random wallets generated');
    console.log('Starting the mint process...');
    await contract.connect(owner).setWhiteListMerkleTreeRoot(treeRoot);
    await Promise.all(
      freeMinterWallets.map(async (wallet) => {
        await contract.connect(owner).addFreeMinter(wallet.address, 2);
      }),
    );

    console.log('Minting reserve...');
    const multipleFreeMintTx = await contract
      .connect(owner)
      .mintReservedGods(10);
    const multipleFreeMintReceipt = await multipleFreeMintTx.wait();
    let freeMintIndex = 0;
    for (const event of multipleFreeMintReceipt.events) {
      if (event.event === 'Minted') {
        expect(event.args[0].toNumber()).to.equal(freeMintIndex);
        freeMintIndex++;
      }
    }

    console.log('Minting free mints...');
    for (let i = 0; i < 10; i++) {
      const multipleFreeMintTx = await contract
        .connect(freeMinterWallets[i])
        .freeMint(2);
      const multipleFreeMintReceipt = await multipleFreeMintTx.wait();
      // 10 reserved, i * 2 because each free mint has 2.
      let freeMintIndex = 10 + i * 2;
      for (const event of multipleFreeMintReceipt.events) {
        if (event.event === 'Minted') {
          expect(event.args[0].toNumber()).to.equal(freeMintIndex);
          freeMintIndex++;
        }
      }
    }

    console.log('Minting whitelists...');
    for (let i = 0; i < 970; i++) {
      await expect(
        contract
          .connect(minterWallets[i])
          .mintWhitelist(
            proofs[minterWallets[i].address].nonce,
            proofs[minterWallets[i].address].proof,
            {
              value: ethers.utils.parseEther('0.0000001'),
            },
          ),
      )
        .to.emit(contract, 'Minted')
        // 10 reserved, 20 free mints
        .withArgs(i + 30);
    }

    console.log('Minting over the limit...');
    await expect(
      contract
        .connect(minterWallets[970])
        .mintWhitelist(
          proofs[minterWallets[970].address].nonce,
          proofs[minterWallets[970].address].proof,
          {
            value: ethers.utils.parseEther('0.0000001'),
          },
        ),
    ).to.be.revertedWith('Not enough supply');
  });
});
