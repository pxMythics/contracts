import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Contract, ContractReceipt, Wallet } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { Deployment } from 'hardhat-deploy/dist/types';
import { Genesis, GenesisSupply, LinkToken } from '../typechain';
import { constants } from './constants';

export const deployTestContract = async (
  baseURI: string = constants.unrevealedURI,
): Promise<{
  contract: Genesis;
  supplyContract: GenesisSupply;
  linkToken: Deployment;
  vrfCoordinator: Deployment;
}> => {
  const LinkToken: Deployment = await deployments.get('LinkToken');
  const VRFCoordinatorMock: Deployment = await deployments.get(
    'VRFCoordinatorMock',
  );

  await deployments.fixture(['Genesis']);
  const GenesisDeployment: Deployment = await deployments.get('Genesis');
  const signers = await ethers.getSigners();
  const owner = signers[9];
  const Genesis = await ethers.getContractAt(
    'Genesis',
    GenesisDeployment.address,
    owner,
  );

  // Set the Genesis contract the proper role on the Supply contract
  const GenesisSupplyDeployment: Deployment = await deployments.get(
    'GenesisSupply',
  );
  const GenesisSupply = await ethers.getContractAt(
    'GenesisSupply',
    GenesisSupplyDeployment.address,
    owner,
  );

  await GenesisSupply.connect(owner).grantRole(
    constants.genesisRole,
    Genesis.address,
  );

  return {
    contract: Genesis,
    supplyContract: GenesisSupply,
    linkToken: LinkToken,
    vrfCoordinator: VRFCoordinatorMock,
  };
};
/**
 *  Checks if the contract has enough $LINK and fund it otherwise
 * @param contract The contract to fund
 * @param deployer The deployer of the contract
 */
export const addLinkFundIfNeeded = async (
  contract: Contract,
  deployer: SignerWithAddress,
) => {
  const linkToken = await deployments.get('LinkToken');
  const LinkContract = await ethers.getContractFactory('LinkToken', deployer);
  const link = (await LinkContract.attach(linkToken.address)) as LinkToken;

  const balance = await link.balanceOf(contract.address);
  if (balance.lte(0)) {
    console.log('Will add funds to contract');
    const receipt = await link.transfer(
      contract.address,
      '1000000000000000000000000000000',
    );
    await receipt.wait();
    console.log('added funds to genesis');
  }
};

export const addressZero = (): string =>
  '0x0000000000000000000000000000000000000000';

export const createRandomWallet = async (
  funder: SignerWithAddress,
): Promise<Wallet> => {
  let wallet = ethers.Wallet.createRandom();
  // TODO: Validate if needed
  wallet = wallet.connect(funder.provider!);
  const sendFundsTx = {
    from: funder.address,
    to: wallet.address,
    value: ethers.utils.parseEther('0.5'),
  };

  await funder.sendTransaction(sendFundsTx);
  return wallet;
};

export const createRandomWallets = async (
  count: number,
  funder: SignerWithAddress,
): Promise<Wallet[]> => {
  const wallets: Wallet[] = [];
  for (let i = 0; i < count; i++) {
    wallets.push(await createRandomWallet(funder));
  }
  return wallets;
};

/**
 * Fully mint the contract using free mints and reserved
 * @param contract The contract to mint
 * @param owner Owner of contract
 * @param freeMinter Signer that will free mint
 */
export const fullMint = async (
  contract: Genesis,
  owner: SignerWithAddress,
  freeMinter: SignerWithAddress,
) => {
  // Add a free minter that can mint everything
  await contract.connect(owner).addFreeMinter(freeMinter.address, 995);
  await contract.connect(owner).mintReservedGods(constants.reservedGodsCount);
  await contract.connect(freeMinter).freeMint(995);
};

/**
 * Generate the seed for the supply contract
 * @param supplyContract The supply contract
 * @param owner Owner of the contract
 * @param oracle The oracle for the VRFCoordinator
 * @param coordinatorMockAddress Mock address
 * @param randomNumber Random number to use
 */
export const generateSeed = async (
  supplyContract: GenesisSupply,
  owner: SignerWithAddress,
  oracle: SignerWithAddress,
  coordinatorMockAddress: string,
  randomNumber: number = Math.floor(Math.random() * 100000),
) => {
  const randomizationTx = await supplyContract.connect(owner).generateSeed();
  const randomizationReceipt: ContractReceipt = await randomizationTx.wait();
  const requestId = randomizationReceipt.events?.find(
    (x: any) => x.event === 'RequestedRandomNumber',
  )?.args![0];
  const vrfCoordinatorMock = await ethers.getContractAt(
    'VRFCoordinatorMock',
    coordinatorMockAddress,
    oracle,
  );

  await vrfCoordinatorMock.callBackWithRandomness(
    requestId,
    randomNumber,
    supplyContract.address,
  );
};
