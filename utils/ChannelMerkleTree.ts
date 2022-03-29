import { ethers } from "ethers";
import { MerkleTree } from "./MerkleTree";

export default class ChannelMerkleTree {
  merkleTree: MerkleTree;

  constructor(entries: { token: string; address: string; cumulativeAmount: number }[]) {
    const hashes = entries.map(({ token, address, cumulativeAmount }) =>
      this.hashEntry(address, token, cumulativeAmount),
    );

    this.merkleTree = new MerkleTree(hashes);
  }

  hashEntry(address: string, token: string, cumulativeAmount: number) {
    return ethers.utils.solidityKeccak256(["address", "address", "uint256"], [address, token, cumulativeAmount]);
  }

  getProof = (address: string, token: string, cumulativeAmount: number) => {
    const hash = this.hashEntry(address, token, cumulativeAmount);

    return this.merkleTree.getProof(hash);
  };
}
