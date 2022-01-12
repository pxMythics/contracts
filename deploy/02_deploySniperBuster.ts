import { ethers } from 'hardhat';
import { DeployFunction, Deployment } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { networkConfig } from '../helper-hardhat-config';
import { LinkToken } from '../typechain';

const deployGenesis: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment,
) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployerSigner = await ethers.getSigner(deployer);
  const chainId = await getChainId();

  const linkTokenAddress = networkConfig[chainId].linkToken;
  const vrfCoordinatorAddress = networkConfig[chainId].vrfCoordinator;
  const keyHash: string = networkConfig[chainId].keyHash;
  const chainlinkFee: string = networkConfig[chainId].chainlinkFee;
  const genesisSupplyAddress = networkConfig[chainId].supplyAddress;

  // Test network deployment only
  if (chainId === '31337') {
    const linkToken = await get('LinkToken');
    const VRFCoordinatorMock = await get('VRFCoordinatorMock');
    const GenesisSupplyDeployment: Deployment = await deployments.get(
      'GenesisSupply',
    );
    console.log(
      `Deploying GenesisSniperBuster on ${chainId} with supply address ${GenesisSupplyDeployment.address} link address ${linkToken.address} and coordinator address ${VRFCoordinatorMock.address}`,
    );
    const genesisReveal = await deploy('GenesisReveal', {
      from: deployer,
      args: [
        GenesisSupplyDeployment.address,
        VRFCoordinatorMock.address,
        linkToken.address,
        keyHash,
        chainlinkFee,
      ],
      log: true,
    });

    await hre.ethernal.push({
      name: 'GenesisReveal',
      address: genesisReveal.address,
    });
    const LinkContract = await ethers.getContractFactory(
      'LinkToken',
      deployerSigner,
    );

    const link = (await LinkContract.attach(linkToken.address)) as LinkToken;
    const receipt = await link.transfer(
      genesisReveal.address,
      '10000000000000000000000000',
    );
    await receipt.wait();
    const balance = await link.balanceOf(genesisReveal.address);
    console.log(`Genesis Shuffler LINK balance: ${balance}`);

    // Live networks
  } else {
    console.log(`Live network deploying GenesisReveal on ${chainId}`);
    await deploy('GenesisReveal', {
      from: deployer,
      args: [
        genesisSupplyAddress,
        vrfCoordinatorAddress,
        linkTokenAddress,
        keyHash,
        chainlinkFee,
      ],
      log: true,
    });
    console.log('Shuffler deployed');
  }
};

export default deployGenesis;
deployGenesis.tags = ['all', 'shuffler'];
