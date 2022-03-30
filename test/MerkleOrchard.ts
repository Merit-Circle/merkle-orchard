import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";
import TimeTraveler from "../utils/TimeTraveler";
import { parseEther } from "@ethersproject/units";
import ChannelMerkleTree from "../utils/ChannelMerkleTree";

import { MerkleOrchard, MerkleOrchard__factory, MockToken, MockToken__factory } from "../src/types";

import { constants, utils } from "ethers";

describe("ERC721Module", function () {
  let deployer: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let accounts: SignerWithAddress[];
  const tokenContracts: MockToken[] = [];

  let merkleOrchardContract: MerkleOrchard;

  const TOKEN_COUNT = 5;
  const NAME = "NAME";
  const SYMBOL = "SYMBOL";
  const BASE_TOKEN_URI = "https://example.com/";
  const MINT_AMOUNT = parseEther("1000");

  const timeTraveler = new TimeTraveler(hre.network.provider);

  before(async () => {
    [deployer, account1, account2, ...accounts] = await hre.ethers.getSigners(); // eslint-disable-line

    merkleOrchardContract = await new MerkleOrchard__factory(deployer).deploy(NAME, SYMBOL, BASE_TOKEN_URI);

    for (let i = 0; i < TOKEN_COUNT; i++) {
      let tokenContract = await new MockToken__factory(deployer).deploy();
      tokenContracts.push(tokenContract);

      await tokenContract.mint(account1.address, MINT_AMOUNT);
      tokenContract = tokenContract.connect(account1);
      await tokenContract.approve(merkleOrchardContract.address, constants.MaxUint256);
    }

    // await orchard.openChannel();

    await timeTraveler.snapshot();
  });

  beforeEach(async () => {
    await timeTraveler.revertSnapshot();
  });

  describe("openChannel", async () => {
    it("increases balance and total supply when opening a channel for single one", async () => {
      const balanceBefore = await merkleOrchardContract.balanceOf(account1.address);
      const totalSupplyBefore = await merkleOrchardContract.totalSupply();

      await merkleOrchardContract.connect(account1).openChannel();

      expect(await merkleOrchardContract.balanceOf(account1.address)).to.eq(balanceBefore.add(1));
      expect(await merkleOrchardContract.totalSupply()).to.eq(totalSupplyBefore.add(1));
      expect(await merkleOrchardContract.ownerOf(0)).to.equal(account1.address);
    });

    it("increases total supply when opening multiple channels", async () => {
      const totalSupplyBefore = await merkleOrchardContract.totalSupply();

      await merkleOrchardContract.connect(account1).openChannel();
      await merkleOrchardContract.connect(account2).openChannel();

      expect(await merkleOrchardContract.totalSupply()).to.eq(totalSupplyBefore.add(2));
      expect(await merkleOrchardContract.ownerOf(0)).to.equal(account1.address);
      expect(await merkleOrchardContract.ownerOf(1)).to.equal(account2.address);
    });

    it("allows user to open multiple channels", async () => {
      const balanceBefore = await merkleOrchardContract.balanceOf(account1.address);

      await merkleOrchardContract.connect(account1).openChannel();
      await merkleOrchardContract.connect(account1).openChannel();

      expect(await merkleOrchardContract.balanceOf(account1.address)).to.eq(balanceBefore.add(2));
      expect(await merkleOrchardContract.ownerOf(0)).to.equal(account1.address);
      expect(await merkleOrchardContract.ownerOf(1)).to.equal(account1.address);
    });
  });

  describe("setMerkleRoot", async () => {
    it("sets merkle root", async () => {
      const newRoot = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0";

      await merkleOrchardContract.connect(account1).openChannel();
      await merkleOrchardContract.connect(account1).setMerkleRoot(0, newRoot);

      expect(await merkleOrchardContract.channels(0)).to.eq(newRoot);
    });

    it("sets multiple merkle roots", async () => {
      const newRoot = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0";
      const newRoot2 = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff2";

      await merkleOrchardContract.connect(account1).openChannel();
      await merkleOrchardContract.connect(account1).setMerkleRoot(0, newRoot);

      await merkleOrchardContract.connect(account1).openChannel();
      await merkleOrchardContract.connect(account1).setMerkleRoot(1, newRoot2);

      expect(await merkleOrchardContract.channels(0)).to.eq(newRoot);
      expect(await merkleOrchardContract.channels(1)).to.eq(newRoot2);
    });

    it("fails if setting merkle root of not owned channel", async () => {
      const newRoot = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0";

      await merkleOrchardContract.connect(account1).openChannel();

      await expect(merkleOrchardContract.connect(account2).setMerkleRoot(0, newRoot)).to.be.revertedWith(
        "NotOwnerError()",
      );
    });
  });

  describe("claim", async () => {
    it("fails if incorrect merkle proof with single entry", async () => {
      const merkleTree = new ChannelMerkleTree([
        {
          address: account1.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 100,
        },
      ]);

      await merkleOrchardContract.openChannel();
      await merkleOrchardContract.setMerkleRoot(0, merkleTree.merkleTree.getRoot());

      const incorrectProof = ["0x6c00000000000000000000000000000000000000000000000000000000000000"];

      await expect(
        merkleOrchardContract.claim(0, account1.address, tokenContracts[0].address, 100, incorrectProof),
      ).to.be.revertedWith("MerkleProofError()");
    });

    it("fails if incorrect merkle proof with multiple entries", async () => {
      const merkleTree = new ChannelMerkleTree([
        {
          address: account1.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 100,
        },
        {
          address: account1.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 99,
        },
      ]);

      await merkleOrchardContract.openChannel();
      await merkleOrchardContract.setMerkleRoot(0, merkleTree.merkleTree.getRoot());

      const incorrectProof = ["0x6c00000000000000000000000000000000000000000000000000000000000000"];

      await expect(
        merkleOrchardContract.claim(0, account1.address, tokenContracts[0].address, 100, incorrectProof),
      ).to.be.revertedWith("MerkleProofError()");
    });

    it("fails on empty array", async () => {
      // When the proof tree consits of one item and an empty proof is passed
      // it will be a valid merkleProof.
      //
      // https://github.com/OpenZeppelin/openzeppelin-contracts/issues/2949

      const merkleTree = new ChannelMerkleTree([
        {
          address: account1.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 100,
        },
      ]);

      await merkleOrchardContract.openChannel();
      await merkleOrchardContract.setMerkleRoot(0, merkleTree.merkleTree.getRoot());

      await expect(
        merkleOrchardContract.claim(
          0,
          account1.address,
          tokenContracts[0].address,
          100,
          [] as unknown as utils.BytesLike[],
        ),
      ).not.to.be.revertedWith("MerkleProofError()");
    });

    it("continues if correct merkle proof", async () => {
      const merkleTree = new ChannelMerkleTree([
        {
          address: account1.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 100,
        },
      ]);

      await merkleOrchardContract.openChannel();
      await merkleOrchardContract.setMerkleRoot(0, merkleTree.merkleTree.getRoot());

      const proof = merkleTree.getProof(account1.address, tokenContracts[0].address, 100);

      await expect(
        merkleOrchardContract.claim(0, account1.address, tokenContracts[0].address, 100, proof),
      ).not.to.be.revertedWith("MerkleProofError()");
    });

    it("does not allow valid merkleproof of other channel", async () => {
      const merkleTree1 = new ChannelMerkleTree([
        {
          address: account1.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 100,
        },
        {
          address: account2.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 100,
        },
      ]);

      const merkleTree2 = new ChannelMerkleTree([
        {
          address: account1.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 99,
        },
        {
          address: account2.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 100,
        },
      ]);

      await merkleOrchardContract.openChannel();
      await merkleOrchardContract.setMerkleRoot(0, merkleTree1.merkleTree.getRoot());

      await merkleOrchardContract.openChannel();
      await merkleOrchardContract.setMerkleRoot(1, merkleTree2.merkleTree.getRoot());

      const proof = merkleTree1.getProof(account1.address, tokenContracts[0].address, 100);

      await expect(
        merkleOrchardContract.claim(0, account1.address, tokenContracts[0].address, 100, proof),
      ).not.to.be.revertedWith("MerkleProofError()");

      await expect(
        merkleOrchardContract.claim(1, account2.address, tokenContracts[0].address, 100, proof),
      ).to.be.revertedWith("MerkleProofError()");
    });
  });

  // describe("fundChannel", async () => {});

  // describe("fundChannelWithEth", async () => {});
});
