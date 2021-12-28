import { ethers } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { networkConfig } from '../helper-hardhat-config';
import { LinkToken } from '../typechain';
import { constants } from '../test/constants';

const deployGenesis: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment,
) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployerSigner = await ethers.getSigner(deployer);
  const chainId = await getChainId();

  const linkToken = await get('LinkToken');
  const VRFCoordinatorMock = await get('VRFCoordinatorMock');
  const linkTokenAddress = linkToken.address;
  const vrfCoordinatorAddress = VRFCoordinatorMock.address;
  const keyHash: string = networkConfig[chainId].keyHash;

  console.log(`Deploying GenesisSupply on ${chainId}`);
  const genesisSupply = await deploy('GenesisSupply', {
    from: deployer,
    args: [vrfCoordinatorAddress, linkTokenAddress, keyHash],
    log: true,
  });
  await hre.ethernal.push({
    name: 'GenesisSupply',
    address: genesisSupply.address,
  });

  console.log(`Deploying Genesis on ${chainId}`);
  const genesis = await deploy('Genesis', {
    from: deployer,
    args: [genesisSupply.address, constants.unrevealedURI],
    log: true,
  });
  await hre.ethernal.push({
    name: 'Genesis',
    address: genesis.address,
  });
  const LinkContract = await ethers.getContractFactory(
    'LinkToken',
    deployerSigner,
  );

  const link = (await LinkContract.attach(linkToken.address)) as LinkToken;
  const receipt = await link.transfer(
    genesisSupply.address,
    '10000000000000000000000000',
  );
  await receipt.wait();
  console.log(`Genesis supply (${genesisSupply.address}) funded with LINK`);
  const balance = await link.balanceOf(genesisSupply.address);
  console.log(`Genesis supply LINK balance: ${balance}`);
};
export default deployGenesis;
deployGenesis.tags = ['all', 'genesis'];
