import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Wallet } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { Deployment } from 'hardhat-deploy/dist/types';
import { Genesis, GenesisSupply } from '../typechain';
import { constants } from './constants';

export const deployTestContract = async (
  baseURI: string = constants.unrevealedURI,
): Promise<{
  contract: Genesis;
  supplyContract: GenesisSupply;
}> => {
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

  return {
    contract: Genesis,
    supplyContract: GenesisSupply,
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
