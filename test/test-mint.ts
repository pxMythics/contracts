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

  this.timeout(5000000);

  it('Testing complete mint (whitelist only)', async function () {
    console.log('Generating the random wallets...');
    // 991 addresses because 10 tokens are reserved for gods
    // We create a 991 addresses to test minting all the supply and making sure we do in fact run out of supply
    // TODO Add reserved mint
    const minterWallets = await createRandomWallets(991, funder);
    const { treeRoot, proofs } = generateMerkleTree(
      minterWallets.map((wallet) => wallet.address),
    );

    console.log('Random wallets generated');
    console.log('Starting the mint process...');
    await contract.connect(owner).setWhiteListMerkleTreeRoot(treeRoot);

    for (let i = 0; i < 990; i++) {
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
        .withArgs(i + 10);
    }
    await expect(
      contract
        .connect(minterWallets[990])
        .mintWhitelist(
          proofs[minterWallets[990].address].nonce,
          proofs[minterWallets[990].address].proof,
          {
            value: ethers.utils.parseEther('0.0000001'),
          },
        ),
    ).to.be.revertedWith('Not enough supply');
  });
});
