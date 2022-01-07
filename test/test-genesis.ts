/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { utils } from 'ethers';
import { Logger } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { Genesis, GenesisSupply } from '../typechain';
import { constants } from './constants';
import {
  addressZero,
  createRandomWallets,
  deployTestContract,
  generateAirdroppedWallet,
} from './test-utils';

describe('Genesis Contract and GenesisSupply Contract', function () {
  let contract: Genesis;
  let supplyContract: GenesisSupply;
  let owner: SignerWithAddress;
  let funder: SignerWithAddress;
  let whitelisted: SignerWithAddress; // 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  let notWhitelisted: SignerWithAddress;
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
    whitelisted = signers[2];
    notWhitelisted = signers[4];
    funder = signers[6];
    const deployedContracts = await deployTestContract();
    contract = deployedContracts.contract;
    supplyContract = deployedContracts.supplyContract;
  });

  // To make sure the test dont fail due to timeout
  this.timeout(5000000);

  describe('Genesis Contract', () => {
    // TODO Adjust with real values
    it('Should initialize the Genesis contract', async () => {
      expect(await contract.price()).to.equal(
        utils.parseEther(constants.mintPrice),
      );
      expect(await contract.WHITELIST_MINT_COUNT()).to.equal(1);
      expect(await contract.mintState()).to.equal(0);
      expect(await contract.paused()).to.be.true;
      expect(await contract.totalSupply()).to.be.equal(
        constants.reservedGodsCount,
      );
    });

    it('Should set the right owner', async () => {
      expect(await contract.owner()).to.equal(await owner.address);
    });

    it('Contract base URI is unrevealed URI if not changed', async function () {
      expect(await contract.tokenURI(1)).to.be.equal(
        `${constants.unrevealedURI}1`,
      );
      expect(await contract.tokenURI(100)).to.be.equal(
        `${constants.unrevealedURI}100`,
      );
    });

    describe('Invalid contract setup', () => {
      it('Cannot mint', async function () {
        await expect(
          contract.mintWhitelist(whiteListNonce, whiteListProof),
        ).to.be.revertedWith('Pausable: paused');
        // Should not allow mint if genesis is not set
        await contract.connect(owner).unpause();
        await expect(
          contract.mintWhitelist(whiteListNonce, whiteListProof),
        ).to.be.revertedWith('Mint not active');

        // Should not allow if tree rootnot set
        await contract.connect(owner).setMintState(1);
        await expect(
          contract
            .connect(whitelisted)
            .mintWhitelist(whiteListNonce, whiteListProof),
        ).to.be.revertedWith('Address is not in the whitelist');

        // Should not allow if genesis not set
        await contract
          .connect(owner)
          .setWhiteListMerkleTreeRoot(whiteListMerkleTreeRoot);
        await expect(
          contract
            .connect(whitelisted)
            .mintWhitelist(whiteListNonce, whiteListProof, {
              value: ethers.utils.parseEther(constants.mintPrice),
            }),
        ).to.be.revertedWith('Not Genesis');
      });

      it('Cannot airdrop', async function () {
        // Airdrop
        const wallets = await createRandomWallets(1, funder);
        const airdrops = await generateAirdroppedWallet(wallets);
        await expect(
          contract.connect(owner).airdrop(airdrops),
        ).to.be.revertedWith('Pausable: paused');
        // Should not allow airdrop if genesis is not set
        await contract.connect(owner).unpause();
        await expect(
          contract.connect(owner).airdrop(airdrops),
        ).to.be.revertedWith('Not Genesis');
      });

      it('Cannot mint reserved', async function () {
        await expect(
          contract.connect(owner).mintReservedGods(constants.reservedGodsCount),
        ).to.be.revertedWith('Pausable: paused');
        // Should not allow mint reserve if genesis is not set
        await contract.connect(owner).unpause();
        await expect(
          contract.connect(owner).mintReservedGods(constants.reservedGodsCount),
        ).to.be.revertedWith('Not Genesis');
      });

      it('Cannot do proper calls if genesis wrongly set', async function () {
        await contract.connect(owner).unpause();
        await supplyContract.connect(owner).setGenesis(owner.address);
        await expect(
          contract.connect(owner).mintReservedGods(constants.reservedGodsCount),
        ).to.be.revertedWith('Not Genesis');
      });
    });
    describe('Contract properly setup', () => {
      beforeEach(async () => {
        await contract.connect(owner).unpause();
        await contract
          .connect(owner)
          .setWhiteListMerkleTreeRoot(whiteListMerkleTreeRoot);
        await supplyContract.connect(owner).setGenesis(contract.address);
      });

      describe('Contract is Closed', () => {
        it('Cannot mint WL mint', async function () {
          await expect(
            contract
              .connect(whitelisted)
              .mintWhitelist(whiteListNonce, whiteListProof, {
                value: ethers.utils.parseEther(constants.mintPrice),
              }),
          ).to.be.revertedWith('Mint not active');
        });

        it('Cannot set base URI', async function () {
          await expect(
            contract.connect(owner).setBaseURI(constants.revealedURI),
          ).to.be.revertedWith('Mint not maintenance');
        });

        it('Can airdrop tokens to random wallets', async function () {
          const wallets = await createRandomWallets(
            constants.numberOfWalletsToAirdrop,
            funder,
          );
          const airdrops = await generateAirdroppedWallet(wallets);
          const airdropsTx = await contract.connect(owner).airdrop(airdrops);
          const airdropsReceipts = await airdropsTx.wait();
          let freeMintIndex = constants.reservedGodsCount;
          for (const event of airdropsReceipts.events || []) {
            if (event.event === 'Transfer') {
              expect(event.args![2].toNumber()).to.equal(freeMintIndex);
              freeMintIndex++;
            }
          }
          for (const airdrop of airdrops) {
            expect(await contract.balanceOf(airdrop.to)).to.be.equal(
              airdrop.count,
            );
          }
        });

        it('Owner cannot mint more than the reserved gods', async function () {
          let returnValue = await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndexAndSupply();
          expect(returnValue[0]).to.equal(0);
          // try to mint more reserved gods that are left
          await expect(
            contract.connect(owner).mintReservedGods(20),
          ).to.be.revertedWith('Not enough reserved gods left');
          returnValue = await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndexAndSupply();
          expect(returnValue[0]).to.equal(0);
        });

        it('Owner cannot mint 0 the reserved gods', async function () {
          let returnValue = await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndexAndSupply();
          expect(returnValue[0]).to.equal(0);
          // try to mint more reserved gods that are left
          await expect(contract.connect(owner).mintReservedGods(0)).to.not.emit(
            contract,
            'Transfer',
          );
          returnValue = await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndexAndSupply();
          expect(returnValue[0]).to.equal(0);
        });

        it('Owner can mint the 6 reserved gods (single transaction)', async function () {
          let returnValue = await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndexAndSupply();
          expect(returnValue[0]).to.equal(0);
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
          returnValue = await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndexAndSupply();
          expect(returnValue[0]).to.equal(constants.reservedGodsCount);

          expect(await contract.balanceOf(owner.address)).to.equal(
            constants.reservedGodsCount,
          );
          await expect(
            contract.connect(owner).mintReservedGods(1),
          ).to.be.revertedWith('Not enough reserved gods left');
        });

        it('Owner can mint the 6 reserved gods (multiple transaction)', async function () {
          let returnValue = await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndexAndSupply();
          expect(returnValue[0]).to.equal(0);
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
          returnValue = await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndexAndSupply();
          expect(returnValue[0]).to.equal(3);

          expect(await contract.balanceOf(owner.address)).to.equal(3);

          multipleFreeMintTx = await contract
            .connect(owner)
            .mintReservedGods(3);
          multipleFreeMintReceipt = await multipleFreeMintTx.wait();
          for (const event of multipleFreeMintReceipt.events || []) {
            if (event.event === 'Transfer') {
              expect(event.args![2].toNumber()).to.equal(freeMintIndex);
              freeMintIndex++;
            }
          }

          returnValue = await supplyContract
            .connect(contract.address)
            .reservedGodsCurrentIndexAndSupply();
          expect(returnValue[0]).to.equal(constants.reservedGodsCount);

          expect(await contract.balanceOf(owner.address)).to.equal(
            constants.reservedGodsCount,
          );
          await expect(
            contract.connect(owner).mintReservedGods(1),
          ).to.be.revertedWith('Not enough reserved gods left');
        });
      });
      describe('Contract is Active', () => {
        beforeEach(async () => {
          await contract.connect(owner).setMintState(1);
        });

        it('Cannot set base URI', async function () {
          await expect(
            contract.connect(owner).setBaseURI(constants.revealedURI),
          ).to.be.revertedWith('Mint not maintenance');
        });
        it('Cannot mint more if not enough ETH is sent', async function () {
          await expect(
            contract
              .connect(whitelisted)
              .mintWhitelist(whiteListNonce, whiteListProof, {
                value: ethers.utils.parseEther('0.00077'),
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
        it('Cannot mint more than the max mint per account', async function () {
          // first mint
          await contract
            .connect(whitelisted)
            .mintWhitelist(whiteListNonce, whiteListProof, {
              value: ethers.utils.parseEther(constants.mintPrice),
            });
          // second mint should fail
          await expect(
            contract
              .connect(whitelisted)
              .mintWhitelist(whiteListNonce, whiteListProof, {
                value: ethers.utils.parseEther(constants.mintPrice),
              }),
          ).to.be.revertedWith('Already minted');
        });

        it('Cannot mint more than the max mint per account after transfer', async function () {
          // first mint
          const tx = await contract
            .connect(whitelisted)
            .mintWhitelist(whiteListNonce, whiteListProof, {
              value: ethers.utils.parseEther(constants.mintPrice),
            });
          const receipt = await tx.wait();
          for (const event of receipt.events || []) {
            if (event.event === 'Transfer') {
              // First mint is always reserved count id
              expect(event.args![2].toNumber()).to.equal(
                constants.reservedGodsCount,
              );
            }
          }
          await expect(
            await contract.balanceOf(whitelisted.address),
          ).to.be.equal(1);
          await contract
            .connect(whitelisted)
            .transferFrom(
              whitelisted.address,
              funder.address,
              constants.reservedGodsCount,
            );
          await expect(
            await contract.balanceOf(whitelisted.address),
          ).to.be.equal(0);
          await expect(await contract.balanceOf(funder.address)).to.be.equal(1);
          // second mint should fail
          await expect(
            contract
              .connect(whitelisted)
              .mintWhitelist(whiteListNonce, whiteListProof, {
                value: ethers.utils.parseEther(constants.mintPrice),
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

        it('A user on the whitelist can mint with a valid nonce and proof', async function () {
          expect(
            await supplyContract.connect(contract.address).currentIndex(),
          ).to.equal(constants.reservedGodsCount);
          expect(await contract.balanceOf(whitelisted.address)).to.equal(0);
          await expect(
            contract
              .connect(whitelisted)
              .mintWhitelist(whiteListNonce, whiteListProof, {
                value: ethers.utils.parseEther(constants.mintPrice),
              }),
          )
            .to.emit(contract, 'Transfer')
            .withArgs(
              addressZero,
              whitelisted.address,
              constants.reservedGodsCount,
            );
          expect(
            await supplyContract.connect(contract.address).currentIndex(),
          ).to.equal(constants.reservedGodsCount + 1);
          expect(await contract.balanceOf(whitelisted.address)).to.equal(1);
        });

        it('Cannot airdrop', async function () {
          // Airdrop
          const wallets = await createRandomWallets(1, funder);
          const airdrops = await generateAirdroppedWallet(wallets);
          await expect(
            contract.connect(owner).airdrop(airdrops),
          ).to.be.revertedWith('Mint not closed');
        });

        it('Cannot mint reserved', async function () {
          await expect(
            contract
              .connect(owner)
              .mintReservedGods(constants.reservedGodsCount),
          ).to.be.revertedWith('Mint not closed');
        });
      });
      describe('Contract is Maintenance', () => {
        beforeEach(async () => {
          await contract.connect(owner).setMintState(2);
        });

        it('Can set base URI', async function () {
          await contract.connect(owner).setBaseURI(constants.revealedURI);
          expect(await contract.tokenURI(1)).to.be.equal(
            `${constants.revealedURI}1`,
          );
          expect(await contract.tokenURI(100)).to.be.equal(
            `${constants.revealedURI}100`,
          );
        });
        it('Cannot airdrop', async function () {
          const wallets = await createRandomWallets(1, funder);
          const airdrops = await generateAirdroppedWallet(wallets);
          await expect(
            contract.connect(owner).airdrop(airdrops),
          ).to.be.revertedWith('Mint not closed');
        });

        it('Cannot mint reserved', async function () {
          await expect(
            contract
              .connect(owner)
              .mintReservedGods(constants.reservedGodsCount),
          ).to.be.revertedWith('Mint not closed');
        });
        it('Cannot mint', async function () {
          await expect(
            contract.mintWhitelist(whiteListNonce, whiteListProof),
          ).to.be.revertedWith('Mint not active');
        });
      });
      describe('Contract is Finalized', () => {
        beforeEach(async () => {
          await contract.connect(owner).setMintState(3);
        });
        it('Cannot set base URI', async function () {
          await expect(
            contract.connect(owner).setBaseURI(constants.revealedURI),
          ).to.be.revertedWith('Mint not maintenance');
        });
        it('Cannot set re-change state', async function () {
          await expect(
            contract.connect(owner).setMintState(2),
          ).to.be.revertedWith('Mint finalized');
        });
        it('Cannot airdrop', async function () {
          const wallets = await createRandomWallets(1, funder);
          const airdrops = await generateAirdroppedWallet(wallets);
          await expect(
            contract.connect(owner).airdrop(airdrops),
          ).to.be.revertedWith('Mint not closed');
        });

        it('Cannot mint reserved', async function () {
          await expect(
            contract
              .connect(owner)
              .mintReservedGods(constants.reservedGodsCount),
          ).to.be.revertedWith('Mint not closed');
        });
        it('Cannot mint', async function () {
          await expect(
            contract.mintWhitelist(whiteListNonce, whiteListProof),
          ).to.be.revertedWith('Mint not active');
        });
      });
    });
  });

  describe('GenesisSupplyContract', () => {
    beforeEach(async () => {
      await contract.connect(owner).unpause();
      await contract
        .connect(owner)
        .setWhiteListMerkleTreeRoot(whiteListMerkleTreeRoot);
      await supplyContract.connect(owner).setGenesis(contract.address);
    });
    it('Should initialize the GenesisSupply contract', async () => {
      expect(await supplyContract.MAX_SUPPLY()).to.equal(constants.totalSupply);
      expect(await supplyContract.currentIndex()).to.equal(
        constants.reservedGodsCount,
      );
      const returnValue = await supplyContract
        .connect(contract.address)
        .reservedGodsCurrentIndexAndSupply();
      expect(returnValue[0]).to.equal(0);
      expect(returnValue[1]).to.equal(constants.reservedGodsCount);
    });

    it('Only the Genesis can access the reservedGodsCurrentIndex', async () => {
      const returnValue = await supplyContract
        .connect(contract.address)
        .reservedGodsCurrentIndexAndSupply();
      expect(returnValue[0]).to.equal(0);
    });

    it('State follows Genesis state', async function () {
      let genesisState = await contract.mintState();
      expect(await supplyContract.mintState()).to.equal(genesisState);

      await contract.setMintState(1);
      genesisState = await contract.mintState();
      expect(await supplyContract.mintState()).to.equal(genesisState);

      await contract.setMintState(2);
      genesisState = await contract.mintState();
      expect(await supplyContract.mintState()).to.equal(genesisState);

      await contract.setMintState(3);
      genesisState = await contract.mintState();
      expect(await supplyContract.mintState()).to.equal(genesisState);
    });

    it('Metadata is not available until before the collection is revealed', async function () {
      await expect(
        supplyContract.connect(contract.address).getMetadataForTokenId(1),
      ).to.be.revertedWith('Not revealed yet');
    });

    it('No metadata is returned if trying to access an invalid token id', async function () {
      await contract.setMintState(2);
      await contract.connect(owner).setBaseURI(constants.revealedURI);
      await expect(
        supplyContract.connect(contract.address).getMetadataForTokenId(1001),
      ).to.be.revertedWith('Invalid tokenId');
      await expect(
        supplyContract.connect(contract.address).getMetadataForTokenId(4000),
      ).to.be.revertedWith('Invalid tokenId');
    });

    it('Metadata is returned if trying to access a valid token id and collection is revealed', async function () {
      contract.connect(owner).mintReservedGods(constants.reservedGodsCount);
      // Airdrop 50, we should expect one to not be a god (there's 50 gods and 6 are reserved)
      const wallets = await createRandomWallets(50, funder);
      const airdrops = await generateAirdroppedWallet(wallets);
      const totalAirdropCount = airdrops.reduce((a, b) => a + b.count, 0);
      await contract.connect(owner).airdrop(airdrops);
      let i = 0;
      let metadata: [number, number] & {
        tokenType: number;
        tokenSubtype: number;
      };

      await contract.setMintState(2);
      await contract.connect(owner).setBaseURI(constants.revealedURI);
      // Check if subtypes are correct
      for (; i < constants.reservedGodsCount + totalAirdropCount; i++) {
        metadata = await supplyContract.getMetadataForTokenId(i);
        if (metadata[0] === 1) {
          expect(metadata![1]).to.be.equal(0);
        } else if (metadata[0] === 2) {
          expect(metadata![1]).to.be.greaterThan(0);
          expect(metadata![1]).to.be.lessThan(3);
        } else if (metadata[0] === 3) {
          expect(metadata![1]).to.be.greaterThan(2);
          expect(metadata![1]).to.be.lessThan(10);
        } else {
          // Unset data, shouldn't happen
          expect(metadata![0]).to.not.be.equal(0);
          expect(metadata![0]).to.not.be.equal(0);
        }
      }
      // Metadata for token 0-9 are all Gods, since 0 is default value, we test over 9
      let foundNonGodMetadata = false;
      i = 10;
      while (!foundNonGodMetadata) {
        metadata = await supplyContract.getMetadataForTokenId(i);
        foundNonGodMetadata = metadata[0] > 1;
        i++;
      }
      expect(metadata![0]).to.be.greaterThan(1);
      expect(metadata![1]).to.be.greaterThan(0);
    });
  });
});
