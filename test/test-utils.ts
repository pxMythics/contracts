import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { deployments, ethers } from 'hardhat';
import { Deployment } from 'hardhat-deploy/dist/types';
import { Contract, ContractReceipt, Wallet } from 'ethers';
import { LinkToken } from '../typechain';
import { constants } from './constants';

export const deployTestContract = async (
  baseURI: string = constants.unrevealedURI,
): Promise<{
  contract: Contract;
  supplyContract: Contract;
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
    value: ethers.utils.parseEther('0.1'),
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
