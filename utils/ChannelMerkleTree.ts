import { BigNumberish, ethers } from "ethers";
import { MerkleTree } from "./MerkleTree";

export interface ChannelMerkleTreeEntry {
  token: string;
  address: string;
  cumulativeAmount: BigNumberish;
}

export default class ChannelMerkleTree {
  merkleTree: MerkleTree;

  constructor(entries: ChannelMerkleTreeEntry[]) {
    const hashes = entries.map(({ token, address, cumulativeAmount }) =>
      this.hashEntry(address, token, cumulativeAmount),
    );

    this.merkleTree = new MerkleTree(hashes);
  }

  hashEntry(address: string, token: string, cumulativeAmount: BigNumberish) {
    return ethers.utils.solidityKeccak256(["address", "address", "uint256"], [address, token, cumulativeAmount]);
  }

  getProof = (address: string, token: string, cumulativeAmount: BigNumberish) => {
    const hash = this.hashEntry(address, token, cumulativeAmount);

    return this.merkleTree.getProof(hash);
  };

  getProofFromEntry = (entry: ChannelMerkleTreeEntry) => {
    return this.getProof(entry.address, entry.token, entry.cumulativeAmount);
  }

}
