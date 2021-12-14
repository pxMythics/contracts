import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { deployments, ethers } from 'hardhat';
import { Deployment } from 'hardhat-deploy/dist/types';
import { Contract, ContractReceipt } from 'ethers';
import { LinkToken } from '../typechain';
import { constants } from './constants';

export const deployTestContract = async (
  baseURI: string = constants.unrevealedURI,
): Promise<{
  contract: Contract;
  linkToken: Deployment;
  vrfCoordinator: Deployment;
}> => {
  let owner: SignerWithAddress;
  const LinkToken: Deployment = await deployments.get('LinkToken');
  const VRFCoordinatorMock: Deployment = await deployments.get(
    'VRFCoordinatorMock',
  );

  await deployments.fixture(['Genesis']);
  const GenesisDeployment: Deployment = await deployments.get('Genesis');
  [owner] = await ethers.getSigners();
  const Genesis = await ethers.getContractAt(
    'Genesis',
    GenesisDeployment.address,
    owner,
  );

  return {
    contract: Genesis,
    linkToken: LinkToken,
    vrfCoordinator: VRFCoordinatorMock,
  };
};
/**
 *  Checks if the contract has enough $LINK and fund it otherwise
 * @param genesis The contract to fund
 * @param deployer The deployer of the contract
 */
export const addLinkFundIfNeeded = async (
  genesis: Contract,
  deployer: SignerWithAddress,
) => {
  const linkToken = await deployments.get('LinkToken');
  const LinkContract = await ethers.getContractFactory('LinkToken', deployer);
  const link = (await LinkContract.attach(linkToken.address)) as LinkToken;

  const balance = await link.balanceOf(genesis.address);
  if (balance.lte(0)) {
    console.log('Will add funds to genesis');
    const receipt = await link.transfer(
      genesis.address,
      '1000000000000000000000000000000',
    );
    await receipt.wait();
    console.log('added funds to genesis');
  }
};

export const addressZero = (): string =>
  '0x0000000000000000000000000000000000000000';

/**
 * Minting function, use only if you don't need to test the minting flow.
 * @param minter The signer that mints
 * @param contract The Genesis contract
 * @param oracle The oracle
 * @param coordinatorMockAddress The coordinator mock address
 */
export const mint = async (
  minter: SignerWithAddress,
  nonce: number,
  proof: string[],
  contract: Contract,
  oracle: SignerWithAddress,
  coordinatorMockAddress: string,
) => {
  const mintTx = await contract.connect(minter).mintWhitelist(nonce, proof, {
    value: ethers.utils.parseEther('0.0000001'),
  });
  const mintReceipt: ContractReceipt = await mintTx.wait();
  const requestId = mintReceipt.events?.find(
    (x: any) => x.event === 'RequestedRandomNFT',
  )?.args![0];

  const vrfCoordinatorMock = await ethers.getContractAt(
    'VRFCoordinatorMock',
    coordinatorMockAddress,
    oracle,
  );

  return vrfCoordinatorMock.callBackWithRandomness(
    requestId,
    Math.floor(Math.random() * 100000),
    contract.address,
  );
};

/**
 * Free mint
 * @param count mint count
 * @param minter The signer that mints
 * @param contract The Genesis contract
 * @param oracle The oracle
 * @param coordinatorMockAddress The coordinator mock address
 */
export const freeMint = async (
  count: number,
  minter: SignerWithAddress,
  nonce: number,
  proof: string[],
  contract: Contract,
  oracle: SignerWithAddress,
  coordinatorMockAddress: string,
) => {
  const mintTx = await contract.connect(minter).freeMint(count, nonce, proof);
  const mintReceipt: ContractReceipt = await mintTx.wait();
  const requestId = mintReceipt.events?.find(
    (x: any) => x.event === 'RequestedRandomNFT',
  )?.args![0];

  const vrfCoordinatorMock = await ethers.getContractAt(
    'VRFCoordinatorMock',
    coordinatorMockAddress,
    oracle,
  );

  return vrfCoordinatorMock.callBackWithRandomness(
    requestId,
    Math.floor(Math.random() * 100000),
    contract.address,
  );
};
