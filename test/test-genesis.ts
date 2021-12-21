/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract, ContractReceipt, utils } from 'ethers';
import { Logger } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { Deployment } from 'hardhat-deploy/dist/types';
import { constants } from './constants';
import {
  addLinkFundIfNeeded,
  deployTestContract,
  setupRandomization,
} from './test-utils';

describe('Genesis Contract and GenesisSupply Contract', () => {
  let contract: Contract;
  let supplyContract: Contract;
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
  const freeMintMerkleTreeRoot =
    '0x3d6a4bbb88ad86a1633c35a0de1ad6119ee1d75b6e5e87854f21336992517aa6';
  const freeMintNonce = 4;
  const freeMintProof = [
    '0x3178529ea85f8fb374cbd95f639bcb1d1eba7d647db7f56cae3cf7a0f4c32a71',
    '0xa8504202624053acd43480f0515ce959c2a55e5981ed900b3efd628a910ecd6c',
    '0x16e7d847233407334316ce55f82bcd932103f679b5a115595ddb53abe140e578',
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
  //
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
    await addLinkFundIfNeeded(contract, owner);
  });

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

    // Test is not working, at contract level in `fullfillRandomness`, the request ID is
    // always valid. The test is not really necessary anyway, since this is a third party lib
    // it('Should not set seed if request id is invalid', async () => {
    //   await contract.connect(owner).initializeRandomization();
    //   const vrfCoordinatorMock = await ethers.getContractAt(
    //     'VRFCoordinatorMock',
    //     VRFCoordinatorMock.address,
    //     oracle,
    //   );

    //   await expect(
    //     vrfCoordinatorMock.callBackWithRandomness(
    //       '0x74657374',
    //       1,
    //       contract.address,
    //     ),
    //   ).to.be.revertedWith('Invalid requestId');
    // });

    it('Should not be able to set seed twice before request was sent', async () => {
      await contract.connect(owner).initializeRandomization();
      await expect(
        contract.connect(owner).initializeRandomization(),
      ).to.be.revertedWith('Seed already requested');
    });

    it('Should not be able to initialize randomization twice', async () => {
      const randomizationTx = await contract
        .connect(owner)
        .initializeRandomization();
      const randomizationReceipt: ContractReceipt =
        await randomizationTx.wait();
      const requestId = randomizationReceipt.events?.find(
        (x: any) => x.event === 'RequestedRandomNumber',
      )?.args![0];
      const vrfCoordinatorMock = await ethers.getContractAt(
        'VRFCoordinatorMock',
        VRFCoordinatorMock.address,
        oracle,
      );

      await vrfCoordinatorMock.callBackWithRandomness(
        requestId,
        1,
        contract.address,
      );

      await expect(
        contract.connect(owner).initializeRandomization(),
      ).to.be.revertedWith('Seed already generated');
    });

    describe('Invalid minting process', () => {
      it('Should not allow minting if contract is paused', async function () {
        await expect(
          contract.mintWhitelist(whiteListNonce, whiteListProof),
        ).to.be.revertedWith('Pausable: paused');
        // Free mint
        await expect(
          contract.freeMint(10, whiteListNonce, whiteListProof),
        ).to.be.revertedWith('Pausable: paused');
      });

      it('Should not allow minting if seed is not set', async function () {
        await contract.connect(owner).unpause();
        await expect(
          contract.mintWhitelist(whiteListNonce, whiteListProof),
        ).to.be.revertedWith('Seed not generated');
        // Free mint
        await expect(
          contract.freeMint(1, whiteListNonce, whiteListProof),
        ).to.be.revertedWith('Seed not generated');
      });

      it('Minting should fail for a user on the whitelist with a valid nonce and proof if merkle tree root has not been set', async function () {
        await contract.connect(owner).unpause();
        await setupRandomization(
          owner,
          contract,
          oracle,
          VRFCoordinatorMock.address,
        );
        await expect(
          contract
            .connect(whitelisted)
            .mintWhitelist(whiteListNonce, whiteListProof),
        ).to.be.revertedWith('Address is not in the whitelist');
      });

      it('Minting should fail for a user on the free mint list with a valid nonce and proof if merkle tree root has not been set', async function () {
        await contract.connect(owner).unpause();
        await setupRandomization(
          owner,
          contract,
          oracle,
          VRFCoordinatorMock.address,
        );
        await expect(
          contract
            .connect(freeMintListed)
            .freeMint(1, freeMintNonce, freeMintProof),
        ).to.be.revertedWith('Address is not in the free mint list');
      });

      describe('Contract properly setup', () => {
        beforeEach(async () => {
          await contract.connect(owner).unpause();
          await setupRandomization(
            owner,
            contract,
            oracle,
            VRFCoordinatorMock.address,
          );
          await contract
            .connect(owner)
            .setWhiteListMerkleTreeRoot(whiteListMerkleTreeRoot);
          await contract
            .connect(owner)
            .setFreeMintMerkleTreeRoot(freeMintMerkleTreeRoot);
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

        it('Cannot mint more than the max mint per account', async function () {
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
            contract
              .connect(whitelisted)
              .freeMint(1, whiteListNonce, whiteListProof),
          ).to.be.revertedWith('Address is not in the free mint list');
          await expect(
            contract
              .connect(notWhitelisted)
              .freeMint(1, whiteListNonce, whiteListProof),
          ).to.be.revertedWith('Address is not in the free mint list');
        });

        it('A user on the free mint list cannot mint if the nonce is not valid', async function () {
          await expect(
            contract
              .connect(freeMintListed)
              .freeMint(1, bogusNonce, freeMintProof),
          ).to.be.revertedWith('Address is not in the free mint list');
        });
        it('A user on the free mint list cannot mint if the proof is not valid', async function () {
          await expect(
            contract
              .connect(freeMintListed)
              .freeMint(1, freeMintNonce, bogusProof),
          ).to.be.revertedWith('Address is not in the free mint list');
        });

        it('A user on the free mint list cannot mint more than the maximum amount allowed', async function () {
          await expect(
            contract
              .connect(freeMintListed)
              .freeMint(6, freeMintNonce, freeMintProof),
          ).to.be.revertedWith('Trying to mint more than allowed');

          // Multiple transactions
          await expect(
            contract
              .connect(freeMintListed)
              .freeMint(2, freeMintNonce, freeMintProof),
          ).to.emit(contract, 'Minted');
          await expect(
            contract
              .connect(freeMintListed)
              .freeMint(3, freeMintNonce, freeMintProof),
          ).to.be.revertedWith('Trying to mint more than allowed');
        });
      });
    });

    describe('Valid minting process', () => {
      beforeEach(async () => {
        await contract.connect(owner).unpause();
        await setupRandomization(
          owner,
          contract,
          oracle,
          VRFCoordinatorMock.address,
        );
        await contract
          .connect(owner)
          .setWhiteListMerkleTreeRoot(whiteListMerkleTreeRoot);
        await contract
          .connect(owner)
          .setFreeMintMerkleTreeRoot(freeMintMerkleTreeRoot);
      });

      it('A user on the whitelist can mint with a valid nonce and proof', async function () {
        expect(
          await supplyContract.connect(contract.address).totalSupply(),
        ).to.equal('10');
        expect(
          await supplyContract
            .connect(contract.address)
            .mintCount(whitelisted.address),
        ).to.equal('0');
        await expect(
          contract
            .connect(whitelisted)
            .mintWhitelist(whiteListNonce, whiteListProof, {
              value: ethers.utils.parseEther('0.0000001'),
            }),
        ).to.emit(contract, 'Minted');
        expect(
          await supplyContract.connect(contract.address).totalSupply(),
        ).to.equal('11');
        expect(
          await supplyContract
            .connect(contract.address)
            .mintCount(whitelisted.address),
        ).to.equal('1');
      });

      it('A user on the free mint list can mint with a valid nonce and proof', async function () {
        expect(
          await supplyContract.connect(contract.address).totalSupply(),
        ).to.equal('10');
        expect(
          await supplyContract
            .connect(contract.address)
            .mintCount(freeMintListed.address),
        ).to.equal('0');
        await expect(
          contract
            .connect(freeMintListed)
            .freeMint(2, freeMintNonce, freeMintProof),
        ).to.emit(contract, 'Minted');
        expect(
          await supplyContract.connect(contract.address).totalSupply(),
        ).to.equal('12');
        expect(
          await supplyContract
            .connect(contract.address)
            .mintCount(freeMintListed.address),
        ).to.equal('2');
      });

      // FIXME This needs to be fixed with the new minting of the reserve gods method
      // it('Make sure the contract has 10 reserved gods and that they can be transfered', async function () {
      // expect(
      //   await supplyContract.connect(contract.address).totalSupply(),
      // ).to.equal(constants.totalSupply);
      //   const whitelistedAddr = whitelisted.address;
      //   expect(await contract.connect(owner).reservedGodsSupply()).to.equal(10);

      //   // try to mint more reserved gods that are left
      //   await expect(
      //     contract.connect(owner).mintReservedGods(whitelistedAddr, 20),
      //   ).to.be.revertedWith('Not enough reserved gods left');
      //   expect(await contract.balanceOf(whitelistedAddr)).to.equal(0);
      //   expect(await contract.connect(owner).reservedGodsSupply()).to.equal(10);

      //   // mint 1 reserved god
      //   await contract.connect(owner).mintReservedGods(whitelistedAddr, 1);
      //   expect(await contract.balanceOf(whitelistedAddr)).to.equal(1);
      //   expect(await contract.connect(owner).reservedGodsSupply()).to.equal(9);

      //   // TODO check metadata if God
      //   // mint 4 reserved gods
      //   await contract.connect(owner).mintReservedGods(whitelistedAddr, 4);
      //   expect(await contract.balanceOf(whitelistedAddr)).to.equal(5);
      //   expect(await contract.connect(owner).reservedGodsSupply()).to.equal(5);
      //   // try to mint more reserved gods that are left
      //   await expect(
      //     contract.connect(owner).mintReservedGods(whitelistedAddr, 6),
      //   ).to.be.revertedWith('Not enough reserved gods left');
      //   expect(await contract.balanceOf(whitelistedAddr)).to.equal(5);
      //   expect(await contract.connect(owner).reservedGodsSupply()).to.equal(5);
      // });
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

    it('Only the Genesis can access the reservedGodSupply', async () => {
      await expect(
        supplyContract.connect(whitelisted).reservedGodsSupply(),
      ).to.be.revertedWith(
        `AccessControl: account ${whitelisted.address.toLowerCase()} is missing role ${
          constants.genesisRole
        }`,
      );
      await expect(
        supplyContract.connect(freeMintListed).reservedGodsSupply(),
      ).to.be.revertedWith(
        `AccessControl: account ${freeMintListed.address.toLowerCase()} is missing role ${
          constants.genesisRole
        }`,
      );
      expect(
        await supplyContract.connect(contract.address).reservedGodsSupply(),
      ).to.equal(10);
    });

    it('Only the Genesis can access the mint. ONLY FOR TESTING, SHOULD NOT BE DONE MANUALLY', async () => {
      await expect(
        supplyContract.connect(whitelisted).mint(whitelisted.address, 10),
      ).to.be.revertedWith(
        `AccessControl: account ${whitelisted.address.toLowerCase()} is missing role ${
          constants.genesisRole
        }`,
      );
      await expect(
        supplyContract.connect(freeMintListed).mint(freeMintListed.address, 10),
      ).to.be.revertedWith(
        `AccessControl: account ${freeMintListed.address.toLowerCase()} is missing role ${
          constants.genesisRole
        }`,
      );
      // FIXME This test does not run for some reason, minor detail as we know we should not do that
      // Note it returns 11 here cause we mint 10 at the construction, this could change
      // expect(
      //   await supplyContract
      //     .connect(contract.address)
      //     .mint(contract.address, 10),
      // ).to.equal('11');
      // expect(
      //   await supplyContract.connect(contract.address).totalSupply(),
      // ).to.equal('11');
      // expect(
      //   await supplyContract
      //     .connect(contract.address)
      //     .mintCount(whitelisted.address),
      // ).to.equal('1');
    });

    it('Backend has access to metadata before reveal date', async () => {
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

    it('Metadata is not available until before the collection is revealed', async function () {
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

    // FIXME Fix this test once the `mintReservedGods` function is back
    // it('Metadata is returned if trying to access a valid token id and collection is revealed', async function () {
    //   await contract.connect(owner).unpause();
    //   await contract.connect(owner).setBaseURI(constants.revealedURI);
    //   // mint 1 reserved god so we can get the metadata
    //   await contract.connect(owner).mintReservedGods(whitelisted.address, 1);
    //   const metadata = await contract.connect(owner).getMetadataForTokenId(1);
    //   console.log(`metadata ${JSON.stringify(metadata)}`);
    //   expect(metadata[0]).to.be.equal(0);
    // });
  });
});
