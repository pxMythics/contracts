import { ethers } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
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
  const mintPrice: string = networkConfig[chainId].mintPrice;
  const unrevealedURI: string = networkConfig[chainId].unrevealedURI;
  const openSeaProxyAddress: string =
    networkConfig[chainId].openSeaProxyAddress;

  // Test network deployment only
  if (chainId === '31337') {
    const linkToken = await get('LinkToken');
    const VRFCoordinatorMock = await get('VRFCoordinatorMock');
    console.log(
      `Deploying GenesisSupply on ${chainId} with link address ${linkToken.address} and coordinator address ${VRFCoordinatorMock.address}`,
    );
    const genesisSupply = await deploy('GenesisSupply', {
      from: deployer,
      args: [
        VRFCoordinatorMock.address,
        linkToken.address,
        keyHash,
        chainlinkFee,
      ],
      log: true,
    });
    console.log(
      `Deploying Genesis on ${chainId} with supply address ${genesisSupply.address}`,
    );
    const genesis = await deploy('Genesis', {
      from: deployer,
      args: [
        genesisSupply.address,
        unrevealedURI,
        mintPrice,
        openSeaProxyAddress,
      ],
      log: true,
    });

    await hre.ethernal.push({
      name: 'GenesisSupply',
      address: genesisSupply.address,
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
    // Live networks
  } else {
    console.log(`Live network deploying GenesisSupply on ${chainId}`);
    const genesisSupply = await deploy('GenesisSupply', {
      from: deployer,
      args: [vrfCoordinatorAddress, linkTokenAddress, keyHash, chainlinkFee],
      log: true,
    });
    console.log(`Live network deploying Genesis on ${chainId}`);
    await deploy('Genesis', {
      from: deployer,
      args: [
        genesisSupply.address,
        unrevealedURI,
        mintPrice,
        openSeaProxyAddress,
      ],
      log: true,
    });
  }
};

export default deployGenesis;
deployGenesis.tags = ['all', 'genesis'];
