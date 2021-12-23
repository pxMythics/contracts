import { ethers } from 'ethers';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';

export interface Proof {
  [key: string]: {
    nonce: number;
    proof: string[];
  };
}

const hashAddress = (nonce: number, address: string): Buffer =>
  Buffer.from(
    ethers.utils
      .solidityKeccak256(['uint256', 'address'], [nonce, address])
      .slice(2),
    'hex',
  );

export const generateMerkleTree = (
  addresses: string[],
): { treeRoot: string; proofs: Proof } => {
  const hashedAddresses = addresses.map((address: string, index: number) =>
    hashAddress(index, address),
  );
  const merkleTree = new MerkleTree(hashedAddresses, keccak256, {
    sortPairs: true,
  });
  const root = merkleTree.getHexRoot();
  const proofs: Proof = {};
  addresses.forEach(
    (address: string, index: number) =>
      (proofs[address] = {
        nonce: index,
        proof: merkleTree.getHexProof(hashedAddresses[index]),
      }),
  );
  return { treeRoot: root, proofs };
};
