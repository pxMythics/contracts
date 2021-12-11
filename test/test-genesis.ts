/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract, utils } from 'ethers';
import { ethers } from 'hardhat';
import { Deployment } from 'hardhat-deploy/dist/types';
import {
  addLinkFundIfNeeded,
  deployTestContract,
  mint,
  freeMint,
} from './test-utils';

describe('Genesis Contract', () => {
  let contract: Contract;
  let VRFCoordinatorMock: Deployment;
  let owner: SignerWithAddress;
  let oracle: SignerWithAddress;
  let whitelisted: SignerWithAddress; // 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  let notWhitelisted: SignerWithAddress;
  let freeMintListed: SignerWithAddress; // 0x976EA74026E726554dB657fA54763abd0C3a0aa9
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

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    owner = signers[9];
    oracle = signers[1];
    whitelisted = signers[2];
    notWhitelisted = signers[4];
    freeMintListed = signers[6];
    const deployedContracts = await deployTestContract();
    contract = deployedContracts.contract;
    VRFCoordinatorMock = deployedContracts.vrfCoordinator;
    // TODO: Perhaps this should be only applied on test where it is needed cause it creates a transaction each time
    await addLinkFundIfNeeded(contract, owner);
  });

  // TODO Adjust with real values
  it('Should initialize the Genesis contract', async () => {
    expect(await contract.MAX_SUPPLY()).to.equal(1000);
    expect(await contract.PRICE()).to.equal(utils.parseEther('0.0000001'));
    expect(await contract.WHITELIST_MINT_COUNT()).to.equal(1);
    expect(await contract.paused()).to.be.true;
  });

  it('Should set the right owner', async () => {
    expect(await contract.owner()).to.equal(await owner.address);
  });

  it('Should not allow minting if contract is paused', async function () {
    await expect(
      mint(
        whitelisted,
        whiteListNonce,
        whiteListProof,
        contract,
        oracle,
        VRFCoordinatorMock.address,
      ),
    ).to.be.revertedWith('Pausable: paused');
    await contract.connect(owner).unpause();
    expect(await contract.paused()).to.be.false;
    await contract.connect(owner).pause();
    expect(await contract.paused()).to.be.true;
    await expect(
      mint(
        whitelisted,
        whiteListNonce,
        whiteListProof,
        contract,
        oracle,
        VRFCoordinatorMock.address,
      ),
    ).to.be.revertedWith('Pausable: paused');
  });

  it('Should allow minting if it is active', async function () {
    await contract.connect(owner).unpause();
    await contract
      .connect(owner)
      .setWhiteListMerkleTreeRoot(whiteListMerkleTreeRoot);
    await expect(
      mint(
        whitelisted,
        whiteListNonce,
        whiteListProof,
        contract,
        oracle,
        VRFCoordinatorMock.address,
      ),
    ).to.emit(contract, 'Minted');
  });

  it('Cannot mint more than the max mint per account', async function () {
    await contract.connect(owner).unpause();
    await contract
      .connect(owner)
      .setWhiteListMerkleTreeRoot(whiteListMerkleTreeRoot);
    // first mint
    mint(
      whitelisted,
      whiteListNonce,
      whiteListProof,
      contract,
      oracle,
      VRFCoordinatorMock.address,
    );
    // second mint should fail
    await expect(
      mint(
        whitelisted,
        whiteListNonce,
        whiteListProof,
        contract,
        oracle,
        VRFCoordinatorMock.address,
      ),
    ).to.be.revertedWith('Already minted');
  });

  it('Cannot mint more if not enough ETH is sent', async function () {
    await contract.connect(owner).unpause();
    await contract
      .connect(owner)
      .setWhiteListMerkleTreeRoot(whiteListMerkleTreeRoot);
    await expect(
      contract
        .connect(whitelisted)
        .mintWhitelist(whiteListNonce, whiteListProof, {
          value: ethers.utils.parseEther('0.000000000001'),
        }),
    ).to.be.revertedWith('Not enough ETH');
  });

  it('Cannot mint if the user is not on the whitelist', async function () {
    await contract.connect(owner).unpause();
    await contract
      .connect(owner)
      .setWhiteListMerkleTreeRoot(whiteListMerkleTreeRoot);
    await expect(
      mint(
        notWhitelisted,
        whiteListNonce,
        whiteListProof,
        contract,
        oracle,
        VRFCoordinatorMock.address,
      ),
    ).to.be.revertedWith('Address is not in the whitelist');
  });

  it('A user on the whitelist cannot mint if the nonce is not valid', async function () {
    await contract.connect(owner).unpause();
    await contract
      .connect(owner)
      .setWhiteListMerkleTreeRoot(whiteListMerkleTreeRoot);
    await expect(
      mint(
        whitelisted,
        bogusNonce,
        whiteListProof,
        contract,
        oracle,
        VRFCoordinatorMock.address,
      ),
    ).to.be.revertedWith('Address is not in the whitelist');
  });

  it('A user on the whitelist cannot mint if the proof is not valid', async function () {
    await contract.connect(owner).unpause();
    await contract
      .connect(owner)
      .setWhiteListMerkleTreeRoot(whiteListMerkleTreeRoot);
    await expect(
      mint(
        whitelisted,
        whiteListNonce,
        bogusProof,
        contract,
        oracle,
        VRFCoordinatorMock.address,
      ),
    ).to.be.revertedWith('Address is not in the whitelist');
  });

  it('A user on the whitelist can mint with a valid nonce and proof', async function () {
    await contract.connect(owner).unpause();
    await contract
      .connect(owner)
      .setWhiteListMerkleTreeRoot(whiteListMerkleTreeRoot);
    await expect(
      mint(
        whitelisted,
        whiteListNonce,
        whiteListProof,
        contract,
        oracle,
        VRFCoordinatorMock.address,
      ),
    ).to.emit(contract, 'Minted');
  });

  it('Cannot free mint if the user is not on the free mint list', async function () {
    await contract.connect(owner).unpause();
    await contract
      .connect(owner)
      .setFreeMintMerkleTreeRoot(freeMintMerkleTreeRoot);
    await expect(
      freeMint(
        1,
        whitelisted,
        whiteListNonce,
        whiteListProof,
        contract,
        oracle,
        VRFCoordinatorMock.address,
      ),
    ).to.be.revertedWith('Address is not in the free mint list');
    await expect(
      freeMint(
        1,
        notWhitelisted,
        whiteListNonce,
        whiteListProof,
        contract,
        oracle,
        VRFCoordinatorMock.address,
      ),
    ).to.be.revertedWith('Address is not in the free mint list');
  });

  it('A user on the free mint list cannot mint if the nonce is not valid', async function () {
    await contract.connect(owner).unpause();
    await contract
      .connect(owner)
      .setFreeMintMerkleTreeRoot(freeMintMerkleTreeRoot);
    await expect(
      freeMint(
        1,
        freeMintListed,
        bogusNonce,
        freeMintProof,
        contract,
        oracle,
        VRFCoordinatorMock.address,
      ),
    ).to.be.revertedWith('Address is not in the free mint list');
  });

  it('A user on the free mint list cannot mint if the proof is not valid', async function () {
    await contract.connect(owner).unpause();
    await contract
      .connect(owner)
      .setFreeMintMerkleTreeRoot(freeMintMerkleTreeRoot);
    await expect(
      freeMint(
        1,
        freeMintListed,
        freeMintNonce,
        bogusProof,
        contract,
        oracle,
        VRFCoordinatorMock.address,
      ),
    ).to.be.revertedWith('Address is not in the free mint list');
  });

  it('A user on the free mint list can mint with a valid nonce and proof', async function () {
    await contract.connect(owner).unpause();
    await contract
      .connect(owner)
      .setFreeMintMerkleTreeRoot(freeMintMerkleTreeRoot);
    await expect(
      freeMint(
        1,
        freeMintListed,
        freeMintNonce,
        freeMintProof,
        contract,
        oracle,
        VRFCoordinatorMock.address,
      ),
    ).to.emit(contract, 'Minted');
  });

  it('A user on the free mint list cannot mint more than the maximum amount allowed (1 transaction)', async function () {
    await contract.connect(owner).unpause();
    await contract
      .connect(owner)
      .setFreeMintMerkleTreeRoot(freeMintMerkleTreeRoot);
    await expect(
      freeMint(
        6,
        freeMintListed,
        freeMintNonce,
        freeMintProof,
        contract,
        oracle,
        VRFCoordinatorMock.address,
      ),
    ).to.be.revertedWith('Trying to mint more than allowed');
  });

  it('A user on the free mint list cannot mint more than the maximum amount allowed (multiple transactions)', async function () {
    await contract.connect(owner).unpause();
    await contract
      .connect(owner)
      .setFreeMintMerkleTreeRoot(freeMintMerkleTreeRoot);
    await expect(
      freeMint(
        2,
        freeMintListed,
        freeMintNonce,
        freeMintProof,
        contract,
        oracle,
        VRFCoordinatorMock.address,
      ),
    ).to.emit(contract, 'Minted');
    await expect(
      freeMint(
        3,
        freeMintListed,
        freeMintNonce,
        freeMintProof,
        contract,
        oracle,
        VRFCoordinatorMock.address,
      ),
    ).to.be.revertedWith('Trying to mint more than allowed');
  });

  it('Make sure the contract has 10 reserved gods and that they can be transfered', async function () {
    const whitelistedAddr = whitelisted.address;
    await contract.connect(owner).unpause();
    expect(await contract.connect(owner).reservedGodsSupply()).to.equal(10);
    await expect(
      contract.connect(whitelisted).reservedGodsSupply(),
    ).to.be.revertedWith('Ownable: caller is not the owner');

    // mint 1 reserved god
    await contract.connect(owner).mintReservedGods(whitelistedAddr, 1);
    expect(await contract.balanceOf(whitelistedAddr)).to.equal(1);
    // TODO check metadata if God
    // mint 4 reserved gods
    await contract.connect(owner).mintReservedGods(whitelistedAddr, 4);
    expect(await contract.balanceOf(whitelistedAddr)).to.equal(5);
    expect(await contract.connect(owner).reservedGodsSupply()).to.equal(5);
    // try to mint more reserved gods that are left
    await expect(
      contract.connect(owner).mintReservedGods(whitelistedAddr, 10),
    ).to.be.revertedWith('Not enough reserved gods left');
  });
});
