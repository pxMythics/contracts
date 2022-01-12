import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ContractReceipt, Wallet } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { Deployment } from 'hardhat-deploy/dist/types';
import { Genesis, GenesisSupply, LinkToken, GenesisReveal } from '../typechain';
import { constants } from './constants';

export const deployTestContract = async (
  baseURI: string = constants.unrevealedURI,
): Promise<{
  contract: Genesis;
  supplyContract: GenesisSupply;
}> => {
  await deployments.fixture(['Genesis']);
  const signers = await ethers.getSigners();
  const owner = signers[9];

  const GenesisDeployment: Deployment = await deployments.get('Genesis');
  const Genesis = await ethers.getContractAt(
    'Genesis',
    GenesisDeployment.address,
    owner,
  );

  const GenesisSupplyDeployment: Deployment = await deployments.get(
    'GenesisSupply',
  );
  const GenesisSupply = await ethers.getContractAt(
    'GenesisSupply',
    GenesisSupplyDeployment.address,
    owner,
  );

  return {
    contract: Genesis,
    supplyContract: GenesisSupply,
  };
};

export const deployShuffler = async (): Promise<{
  shuffler: GenesisReveal;
  linkToken: Deployment;
  vrfCoordinator: Deployment;
}> => {
  const signers = await ethers.getSigners();
  const owner = signers[9];
  const LinkToken: Deployment = await deployments.get('LinkToken');
  const VRFCoordinatorMock: Deployment = await deployments.get(
    'VRFCoordinatorMock',
  );

  const GenesisRevealDeployment: Deployment = await deployments.get(
    'GenesisReveal',
  );
  const GenesisReveal = await ethers.getContractAt(
    'GenesisReveal',
    GenesisRevealDeployment.address,
    owner,
  );

  return {
    shuffler: GenesisReveal,
    linkToken: LinkToken,
    vrfCoordinator: VRFCoordinatorMock,
  };
};

export const addressZero = (): string =>
  '0x0000000000000000000000000000000000000000';

export const createRandomWallet = async (
  funder: SignerWithAddress,
): Promise<Wallet> => {
  let wallet = ethers.Wallet.createRandom();
  wallet = wallet.connect(funder.provider!);
  const sendFundsTx = {
    from: funder.address,
    to: wallet.address,
    value: ethers.utils.parseEther('1'),
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

export interface Airdrop {
  to: string;
  count: number;
}

export const getAirdropData = (airdrops: Airdrop[]) =>
  airdrops.map((airdrop) => [airdrop.to, airdrop.count]);

export const generateAirdroppedWallet = async (
  wallets: Wallet[],
  count: number = Math.floor(Math.random() * 2) + 1,
): Promise<Airdrop[]> => {
  return wallets.map((wallet) => ({
    to: wallet.address,
    count: count,
  }));
};

/**
 * Generate the seed for the shuffler contract
 * @param shufflerContract The shuffler contract
 * @param owner Owner of the contract
 * @param oracle The oracle for the VRFCoordinator
 * @param coordinatorMockAddress Mock address
 * @param randomNumber Random number to use
 */
export const generateSeed = async (
  shuffler: GenesisReveal,
  owner: SignerWithAddress,
  oracle: SignerWithAddress,
  coordinatorMockAddress: string,
  randomNumber: number = Math.floor(Math.random() * 100000),
) => {
  const randomizationTx = await shuffler.connect(owner).generateSeed();
  const randomizationReceipt: ContractReceipt = await randomizationTx.wait();
  const requestId = randomizationReceipt.events?.find(
    (x: any) => x.event === 'RequestedRandomNumber',
  )?.args![0];
  const vrfCoordinatorMock = await ethers.getContractAt(
    'VRFCoordinatorMock',
    coordinatorMockAddress,
    oracle,
  );
  return await vrfCoordinatorMock.callBackWithRandomness(
    requestId,
    randomNumber,
    shuffler.address,
  );
};
