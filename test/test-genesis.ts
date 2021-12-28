/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { utils } from 'ethers';
import { Logger } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { Deployment } from 'hardhat-deploy/dist/types';
import { Genesis, GenesisSupply } from '../typechain';
import { constants } from './constants';
import {
  addLinkFundIfNeeded,
  addressZero,
  deployTestContract,
  fullMint,
  generateSeed,
} from './test-utils';

describe('Genesis Contract and GenesisSupply Contract', function () {
  let contract: Genesis;
  let supplyContract: GenesisSupply;
  let VRFCoordinatorMock: Deployment;
  let owner: SignerWithAddress;
  let oracle: SignerWithAddress;
  let whitelisted: SignerWithAddress; // 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  let notWhitelisted: SignerWithAddress;
  let freeMintListed: SignerWithAddress; // 0x976EA74026E726554dB657fA54763abd0C3a0aa9
  let backend: SignerWithAddress;
  const whiteListMerkleTreeRoot =
    '0xe32689cba5d4fa1698e45bcc090b47a13a1ea9c41671c5205bebeecd5b9ebb7f';
  const whiteListNonce = 0;
  const whiteListProof = [
    '0x6979242712a952fdd0e6020e3b0c5ab00e441efc3a8e5f3550b44bdfef0bc8fe',
    '0xc2fcc0de40e2633995715cba771542dd0e55202ea7203cba6597154fa5166b9a',
    '0x7f5e7f7411eff0a9aa5209931feb717d400cdea255ab6b415205b35e0b4e5dd1',
    '0xd0c7c1535456333e883f588cd7b1fd89c69d9cccb3e44384df48131d279c7242',
    '0x917003bd175f847c8cace233737e6bea0ec6857553135fad5679bafa987377c6',
    '0xf55e6ce46027df69d182f452137be4258598c22fd4c86ea842590ae9eb1aad7b',
    '0x2ca4e96251485c7f5b3078c31b7befb7df302db3f70475be3850d200da04915f',
    '0xf7a619404c2ecfbc206616a2be4a8c6d737a47e50c4f321c4bc4db2823d49a82',
    '0x88dfe75f40c9b2f91343fa790ca8779dd027c5ed230ce71b83b56fbae4503c3b',
    '0x4295d089ba50f6833e1eebf5dc495f3ab00c0ca99de72602439df04fd0fd00c4',
  ];
  const bogusNonce = 99999;
  const bogusProof = [
    '0x0ffde5c80d693e686066165e79e1aa33f44b9b3b61ab358e9cda2cfa5988c2af',
  ];
  // Remove warnings
  ethers.utils.Logger.setLogLevel(Logger.levels.ERROR);

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    owner = signers[9];
    oracle = signers[1];
    whitelisted = signers[2];
    notWhitelisted = signers[4];
    freeMintListed = signers[6];
    backend = signers[8];
    const deployedContracts = await deployTestContract();
    contract = deployedContracts.contract;
    supplyContract = deployedContracts.supplyContract;
    VRFCoordinatorMock = deployedContracts.vrfCoordinator;
    // TODO: Perhaps this should be only applied on test where it is needed cause it creates a transaction each time
    await addLinkFundIfNeeded(supplyContract, owner);
  });

  // To make sure the test dont fail due to timeout
  this.timeout(5000000);

  describe('Genesis Contract', () => {
    // TODO Adjust with real values
    it('Should initialize the Genesis contract', async () => {
      expect(await contract.PRICE()).to.equal(utils.parseEther('0.0000001'));
      expect(await contract.WHITELIST_MINT_COUNT()).to.equal(1);
      expect(await contract.paused()).to.be.true;
    });

    it('Should set the right owner', async () => {
      expect(await contract.owner()).to.equal(await owner.address);
    });

    it('Should not be able to set free minter address twice', async () => {
      await contract.connect(owner).addFreeMinter(freeMintListed.address, 4);
      await expect(
        contract.connect(owner).addFreeMinter(freeMintListed.address, 4),
      ).to.be.revertedWith('Already added');
    });

    describe('Invalid contract setup', () => {
      it('Should not allow minting if contract is paused', async function () {
        await expect(
          contract.mintWhitelist(whiteListNonce, whiteListProof),
        ).to.be.revertedWith('Pausable: paused');
        // Free mint
        await expect(contract.freeMint(10)).to.be.revertedWith(
          'Pausable: paused',
        );
      });

      it('Minting should fail for a user on the whitelist with a valid nonce and proof if merkle tree root has not been set', async function () {
        await contract.connect(owner).unpause();
        await expect(
          contract
            .connect(whitelisted)
            .mintWhitelist(whiteListNonce, whiteListProof),
        ).to.be.revertedWith('Address is not in the whitelist');
      });
    });

    describe('Contract properly setup', () => {
      beforeEach(async () => {
        await contract.connect(owner).unpause();
        await contract
          .connect(owner)
          .setWhiteListMerkleTreeRoot(whiteListMerkleTreeRoot);
      });
      it('Cannot mint more if not enough ETH is sent', async function () {
        await expect(
          contract
            .connect(whitelisted)
            .mintWhitelist(whiteListNonce, whiteListProof, {
              value: ethers.utils.parseEther('0.000000000001'),
            }),
        ).to.be.revertedWith('Not enough ETH');
      });

      it('A user on the whitelist cannot mint if the proof is not valid', async function () {
        await expect(
          contract
            .connect(whitelisted)
            .mintWhitelist(whiteListNonce, bogusProof),
        ).to.be.revertedWith('Address is not in the whitelist');
      });

      it('A user on the whitelist cannot mint if the nonce is not valid', async function () {
        await expect(
          contract
            .connect(whitelisted)
            .mintWhitelist(bogusNonce, whiteListProof),
        ).to.be.revertedWith('Address is not in the whitelist');
      });

      it('Should not allow minting if seed is not generated', async function () {
        await contract
          .connect(owner)
          .setWhiteListMerkleTreeRoot(whiteListMerkleTreeRoot);

        await expect(
          contract
            .connect(whitelisted)
            .mintWhitelist(whiteListNonce, whiteListProof, {
              value: ethers.utils.parseEther('0.0000001'),
            }),
        ).to.be.revertedWith('Seed not generated');

        // Free mint
        await contract.connect(owner).addFreeMinter(freeMintListed.address, 4);
        await expect(
          contract.connect(freeMintListed).freeMint(4),
        ).to.be.revertedWith('Seed not generated');
      });

      it('Cannot mint more than the max mint per account', async function () {
        await generateSeed(
          supplyContract,
          owner,
          oracle,
          VRFCoordinatorMock.address,
        );
        // first mint
        await contract
          .connect(whitelisted)
          .mintWhitelist(whiteListNonce, whiteListProof, {
            value: ethers.utils.parseEther('0.0000001'),
          });
        // second mint should fail
        await expect(
          contract
            .connect(whitelisted)
            .mintWhitelist(whiteListNonce, whiteListProof, {
              value: ethers.utils.parseEther('0.0000001'),
            }),
        ).to.be.revertedWith('Already minted');
      });

      it('Cannot mint if the user is not on the whitelist', async function () {
        await expect(
          contract
            .connect(notWhitelisted)
            .mintWhitelist(whiteListNonce, whiteListProof),
        ).to.be.revertedWith('Address is not in the whitelist');
      });

      it('Cannot free mint if the user is not on the free mint list', async function () {
        await expect(
          contract.connect(whitelisted).freeMint(1),
        ).to.be.revertedWith('Address is not in the free mint list');

        await contract.connect(owner).addFreeMinter(freeMintListed.address, 4);

        await expect(
          contract.connect(notWhitelisted).freeMint(1),
        ).to.be.revertedWith('Address is not in the free mint list');
      });

      it('A user on the free mint list cannot mint more than the maximum amount allowed', async function () {
        await contract.connect(owner).addFreeMinter(freeMintListed.address, 4);

        await generateSeed(
          supplyContract,
          owner,
          oracle,
          VRFCoordinatorMock.address,
        );

        // More than max count
        await expect(
          contract.connect(freeMintListed).freeMint(6),
        ).to.be.revertedWith('Trying to mint more than allowed');

        // Multiple transactions
        // TODO Add transfer event test
        await contract.connect(freeMintListed).freeMint(2);
        await expect(
          contract.connect(freeMintListed).freeMint(3),
        ).to.be.revertedWith('Trying to mint more than allowed');
      });

      it('Owner cannot mint more than the reserved gods', async function () {
        expect(
          await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndex(),
        ).to.equal(0);
        // try to mint more reserved gods that are left
        await expect(
          contract.connect(owner).mintReservedGods(20),
        ).to.be.revertedWith('Not enough reserved gods left');
        expect(
          await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndex(),
        ).to.equal(0);
      });

      it('Owner cannot mint 0 the reserved gods', async function () {
        expect(
          await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndex(),
        ).to.equal(0);
        // try to mint more reserved gods that are left
        await expect(contract.connect(owner).mintReservedGods(0)).to.not.emit(
          contract,
          'Transfer',
        );
        expect(
          await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndex(),
        ).to.equal(0);
      });
    });

    describe('Valid minting process', () => {
      beforeEach(async () => {
        await contract.connect(owner).unpause();
        await contract
          .connect(owner)
          .setWhiteListMerkleTreeRoot(whiteListMerkleTreeRoot);
        await contract.connect(owner).addFreeMinter(freeMintListed.address, 2);
        await generateSeed(
          supplyContract,
          owner,
          oracle,
          VRFCoordinatorMock.address,
        );
      });

      it('A user on the whitelist can mint with a valid nonce and proof', async function () {
        expect(
          await supplyContract.connect(contract.address).currentIndex(),
        ).to.equal(10);
        expect(await contract.balanceOf(whitelisted.address)).to.equal(0);
        await expect(
          contract
            .connect(whitelisted)
            .mintWhitelist(whiteListNonce, whiteListProof, {
              value: ethers.utils.parseEther('0.0000001'),
            }),
        )
          .to.emit(contract, 'Transfer')
          .withArgs(addressZero, whitelisted.address, 10);
        expect(
          await supplyContract.connect(contract.address).currentIndex(),
        ).to.equal(11);
        expect(await contract.balanceOf(whitelisted.address)).to.equal(1);
      });

      it('A user on the free mint list can mint', async function () {
        expect(
          await supplyContract.connect(contract.address).currentIndex(),
        ).to.equal(10);
        expect(await contract.balanceOf(whitelisted.address)).to.equal(0);

        const multipleFreeMintTx = await contract
          .connect(freeMintListed)
          .freeMint(2);
        const multipleFreeMintReceipt = await multipleFreeMintTx.wait();
        let freeMintIndex = 10;
        for (const event of multipleFreeMintReceipt.events || []) {
          if (event.event === 'Transfer') {
            expect(event.args![2].toNumber()).to.equal(freeMintIndex);
            freeMintIndex++;
          }
        }

        expect(
          await supplyContract.connect(contract.address).currentIndex(),
        ).to.equal(12);
        expect(await contract.balanceOf(freeMintListed.address)).to.equal(2);
      });

      it('Mint the 10 reserved gods (single transaction)', async function () {
        expect(
          await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndex(),
        ).to.equal(0);
        const multipleFreeMintTx = await contract
          .connect(owner)
          .mintReservedGods(10);
        const multipleFreeMintReceipt = await multipleFreeMintTx.wait();
        let freeMintIndex = 0;
        for (const event of multipleFreeMintReceipt.events || []) {
          if (event.event === 'Transfer') {
            expect(event.args![2].toNumber()).to.equal(freeMintIndex);
            freeMintIndex++;
          }
        }
        expect(
          await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndex(),
        ).to.equal(10);

        expect(await contract.balanceOf(owner.address)).to.equal(10);
        await expect(
          contract.connect(owner).mintReservedGods(1),
        ).to.be.revertedWith('Not enough reserved gods left');
      });

      it('Mint the 10 reserved gods (multiple transaction)', async function () {
        expect(
          await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndex(),
        ).to.equal(0);
        let multipleFreeMintTx = await contract
          .connect(owner)
          .mintReservedGods(3);
        let multipleFreeMintReceipt = await multipleFreeMintTx.wait();
        let freeMintIndex = 0;
        for (const event of multipleFreeMintReceipt.events || []) {
          if (event.event === 'Transfer') {
            expect(event.args![2].toNumber()).to.equal(freeMintIndex);
            freeMintIndex++;
          }
        }
        expect(
          await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndex(),
        ).to.equal(3);

        expect(await contract.balanceOf(owner.address)).to.equal(3);

        multipleFreeMintTx = await contract.connect(owner).mintReservedGods(7);
        multipleFreeMintReceipt = await multipleFreeMintTx.wait();
        for (const event of multipleFreeMintReceipt.events || []) {
          if (event.event === 'Transfer') {
            expect(event.args![2].toNumber()).to.equal(freeMintIndex);
            freeMintIndex++;
          }
        }

        expect(
          await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndex(),
        ).to.equal(10);

        expect(await contract.balanceOf(owner.address)).to.equal(10);
        await expect(
          contract.connect(owner).mintReservedGods(1),
        ).to.be.revertedWith('Not enough reserved gods left');
      });
    });

    it('Contract base URI is unrevealed URI if not changed', async function () {
      await contract.connect(owner).unpause();
      expect(await contract.tokenURI(1)).to.be.equal(constants.unrevealedURI);
      expect(await contract.tokenURI(100)).to.be.equal(constants.unrevealedURI);
    });

    it('Contract base URI is revealed URI if set', async function () {
      await contract.connect(owner).unpause();
      await contract.connect(owner).setBaseURI(constants.revealedURI);
      expect(await contract.tokenURI(1)).to.be.equal(
        `${constants.revealedURI}1`,
      );
      expect(await contract.tokenURI(100)).to.be.equal(
        `${constants.revealedURI}100`,
      );
    });
  });

  describe('GenesisSupplyContract', () => {
    it('Should initialize the GenesisSupply contract', async () => {
      expect(await supplyContract.MAX_SUPPLY()).to.equal(1000);
    });

    it('Only the Genesis can access the reservedGodsCurrentIndex', async () => {
      await expect(
        supplyContract.connect(whitelisted).reservedGodsCurrentIndex(),
      ).to.be.revertedWith(
        `AccessControl: account ${whitelisted.address.toLowerCase()} is missing role ${
          constants.genesisRole
        }`,
      );
      await expect(
        supplyContract.connect(freeMintListed).reservedGodsCurrentIndex(),
      ).to.be.revertedWith(
        `AccessControl: account ${freeMintListed.address.toLowerCase()} is missing role ${
          constants.genesisRole
        }`,
      );
      expect(
        await supplyContract
          .connect(contract.address)
          .reservedGodsCurrentIndex(),
      ).to.equal(0);
    });

    it('Only the Genesis can access the mint. ONLY FOR TESTING, SHOULD NOT BE DONE MANUALLY', async () => {
      await expect(
        supplyContract.connect(whitelisted).mint(1),
      ).to.be.revertedWith(
        `AccessControl: account ${whitelisted.address.toLowerCase()} is missing role ${
          constants.genesisRole
        }`,
      );
      await expect(
        supplyContract.connect(freeMintListed).mint(1),
      ).to.be.revertedWith(
        `AccessControl: account ${freeMintListed.address.toLowerCase()} is missing role ${
          constants.genesisRole
        }`,
      );
    });

    it('Backend has access to metadata before reveal date', async () => {
      await contract.connect(owner).unpause();
      await expect(
        supplyContract.connect(backend.address).getMetadataForTokenId(1),
      ).to.be.revertedWith('Not revealed yet');

      await supplyContract
        .connect(owner)
        .grantRole(constants.backendRole, backend.address);

      // TODO Update when metadata is available
      const metadata = await supplyContract
        .connect(backend.address)
        .getMetadataForTokenId(1);
      expect(metadata).to.be.equal(metadata);
    });

    it('Should not be able to generate seed twice', async () => {
      await contract.connect(owner).unpause();
      await generateSeed(
        supplyContract,
        owner,
        oracle,
        VRFCoordinatorMock.address,
      );

      await expect(
        supplyContract.connect(owner).generateSeed(),
      ).to.be.revertedWith('Seed already generated');
    });

    it('Should not be able to randomize collection twice before ChainLink callback', async () => {
      await contract.connect(owner).unpause();
      await supplyContract.connect(owner).generateSeed();
      await expect(
        supplyContract.connect(owner).generateSeed(),
      ).to.be.revertedWith('Randomization already started');
    });

    it('Metadata is not available until before the collection is revealed', async function () {
      await contract.connect(owner).unpause();
      await expect(
        supplyContract.connect(contract.address).getMetadataForTokenId(1),
      ).to.be.revertedWith('Not revealed yet');
    });

    it('No metadata is returned if trying to access an invalid token id', async function () {
      await contract.connect(owner).unpause();
      await contract.connect(owner).setBaseURI(constants.revealedURI);
      await expect(
        supplyContract.connect(contract.address).getMetadataForTokenId(0),
      ).to.be.revertedWith('Invalid tokenId');
      await expect(
        supplyContract.connect(contract.address).getMetadataForTokenId(1001),
      ).to.be.revertedWith('Invalid tokenId');
      await expect(
        supplyContract.connect(contract.address).getMetadataForTokenId(4000),
      ).to.be.revertedWith('Invalid tokenId');
    });

    it('Metadata is returned if trying to access a valid token id and collection is revealed', async function () {
      await contract.connect(owner).unpause();
      await contract.connect(owner).setBaseURI(constants.revealedURI);
      await generateSeed(
        supplyContract,
        owner,
        oracle,
        VRFCoordinatorMock.address,
      );

      // Mint 50, we should expect one to not be a god (there's 50 gods and 10 are reserved)
      await contract.connect(owner).addFreeMinter(freeMintListed.address, 50);
      await contract.connect(freeMintListed).freeMint(50);

      // Metadata for token 0-9 are all Gods, since 0 is default value, we test over 9
      let foundNonGodMetadata = false;
      let i = 10;
      let metadata: [number] & { tokenType: number };
      while (!foundNonGodMetadata) {
        metadata = await supplyContract.getMetadataForTokenId(i);
        console.log(
          `checking id ${i} with metadata being ${JSON.stringify(metadata)}`,
        );
        foundNonGodMetadata = metadata[0] > 0;
        i++;
      }
      expect(metadata![0]).to.not.be.equal(0);
    });
  });
});
