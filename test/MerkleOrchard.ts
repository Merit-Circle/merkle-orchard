import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";
import TimeTraveler from "../utils/TimeTraveler";
import { parseEther } from "@ethersproject/units";
import ChannelMerkleTree from "../utils/ChannelMerkleTree";

import { MerkleOrchard, MerkleOrchard__factory, MockToken, MockToken__factory } from "../src/types";

import { constants, ethers, utils } from "ethers";

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

      await tokenContract.mint(account2.address, MINT_AMOUNT);
      tokenContract = tokenContract.connect(account2);
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

      expect(await merkleOrchardContract.getMerkleRoot(0)).to.eq(newRoot);
    });

    it("sets multiple merkle roots", async () => {
      const newRoot = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0";
      const newRoot2 = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff2";

      await merkleOrchardContract.connect(account1).openChannel();
      await merkleOrchardContract.connect(account1).setMerkleRoot(0, newRoot);

      await merkleOrchardContract.connect(account1).openChannel();
      await merkleOrchardContract.connect(account1).setMerkleRoot(1, newRoot2);

      expect(await merkleOrchardContract.getMerkleRoot(0)).to.eq(newRoot);
      expect(await merkleOrchardContract.getMerkleRoot(1)).to.eq(newRoot2);
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

    it("claims entire reserves", async () => {
      const merkleTree = new ChannelMerkleTree([
        {
          address: account1.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 50,
        },
      ]);

      await merkleOrchardContract.openChannel();
      await merkleOrchardContract.setMerkleRoot(0, merkleTree.merkleTree.getRoot());

      const proof = merkleTree.getProof(account1.address, tokenContracts[0].address, 50);

      const clientBalanceBefore = await tokenContracts[0].balanceOf(account1.address);

      await merkleOrchardContract.connect(account2).fundChannel(0, tokenContracts[0].address, 50);
      await merkleOrchardContract.claim(0, account1.address, tokenContracts[0].address, 50, proof);

      expect(await tokenContracts[0].balanceOf(account1.address)).to.eq(clientBalanceBefore.add(50));
    });

    it("claims entire eth reserves", async () => {
      const merkleTree = new ChannelMerkleTree([
        {
          address: account1.address,
          token: constants.AddressZero,
          cumulativeAmount: 50,
        },
      ]);

      await merkleOrchardContract.openChannel();
      await merkleOrchardContract.setMerkleRoot(0, merkleTree.merkleTree.getRoot());

      const proof = merkleTree.getProof(account1.address, constants.AddressZero, 50);

      const clientBalanceBefore = await account1.getBalance();

      await merkleOrchardContract.connect(account2).fundChannelWithEth(0, { value: 50 });
      await merkleOrchardContract.claim(0, account1.address, constants.AddressZero, 50, proof);

      expect(await account1.getBalance()).to.eq(clientBalanceBefore.add(50));
    });

    it("reverts when claiming more than reserves", async () => {
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

      const clientBalanceBefore = await tokenContracts[0].balanceOf(account1.address);

      await merkleOrchardContract.connect(account2).fundChannel(0, tokenContracts[0].address, 50);
      await expect(merkleOrchardContract.claim(0, account1.address, tokenContracts[0].address, 100, proof)).to.be
        .reverted;

      expect(await tokenContracts[0].balanceOf(account1.address)).to.eq(clientBalanceBefore);
    });

    it("reverts when multiple clients try claiming", async () => {
      const merkleTree = new ChannelMerkleTree([
        {
          address: account1.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 100,
        },
        {
          address: accounts[0].address,
          token: tokenContracts[0].address,
          cumulativeAmount: 100,
        },
      ]);

      await merkleOrchardContract.openChannel();
      await merkleOrchardContract.setMerkleRoot(0, merkleTree.merkleTree.getRoot());

      const proof = merkleTree.getProof(account1.address, tokenContracts[0].address, 100);
      const proof2 = merkleTree.getProof(account1.address, tokenContracts[0].address, 100);

      const clientBalanceBefore = await tokenContracts[0].balanceOf(account1.address);
      const clientBalanceBefore2 = await tokenContracts[0].balanceOf(accounts[0].address);

      await merkleOrchardContract.connect(account2).fundChannel(0, tokenContracts[0].address, 100);
      await merkleOrchardContract.claim(0, account1.address, tokenContracts[0].address, 100, proof2);

      await expect(merkleOrchardContract.claim(0, accounts[0].address, tokenContracts[0].address, 100, proof)).to.be
        .reverted;

      expect(await tokenContracts[0].balanceOf(account1.address)).to.eq(clientBalanceBefore.add(100));
      expect(await tokenContracts[0].balanceOf(accounts[0].address)).to.eq(clientBalanceBefore2);
    });

    it("does not allow cumulativeBalance to be exceeded", async () => {
      const merkleTree = new ChannelMerkleTree([
        {
          address: account1.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 100,
        },
      ]);

      const clientBalanceBefore = await tokenContracts[0].balanceOf(account1.address);

      await merkleOrchardContract.openChannel();
      await merkleOrchardContract.setMerkleRoot(0, merkleTree.merkleTree.getRoot());

      const proof = merkleTree.getProof(account1.address, tokenContracts[0].address, 100);

      await merkleOrchardContract.connect(account2).fundChannel(0, tokenContracts[0].address, 100);
      await merkleOrchardContract.claim(0, account1.address, tokenContracts[0].address, 100, proof);

      const clientBalanceAfterFirstClaim = await tokenContracts[0].balanceOf(account1.address);

      expect(clientBalanceAfterFirstClaim).to.eq(clientBalanceBefore.add(100));

      await merkleOrchardContract.connect(account2).fundChannel(0, tokenContracts[0].address, 100);
      await merkleOrchardContract.claim(0, account1.address, tokenContracts[0].address, 100, proof);

      expect(await tokenContracts[0].balanceOf(account1.address)).to.eq(clientBalanceAfterFirstClaim);
      expect(await merkleOrchardContract.getChannelReservesByToken(0, tokenContracts[0].address)).to.eq(100);
    });

    it("does correctly claim after merkleTree update", async () => {
      const merkleTree = new ChannelMerkleTree([
        {
          address: account1.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 100,
        },
      ]);

      await merkleOrchardContract.openChannel();
      await merkleOrchardContract.setMerkleRoot(0, merkleTree.merkleTree.getRoot());
      await merkleOrchardContract.connect(account2).fundChannel(0, tokenContracts[0].address, 100);

      const clientBalanceBefore = await tokenContracts[0].balanceOf(account1.address);
      const proof = merkleTree.getProof(account1.address, tokenContracts[0].address, 100);

      await merkleOrchardContract.claim(0, account1.address, tokenContracts[0].address, 100, proof);

      const clientBalanceAfterFirstClaim = await tokenContracts[0].balanceOf(account1.address);

      expect(clientBalanceAfterFirstClaim).to.eq(clientBalanceBefore.add(100));
      expect(await merkleOrchardContract.getChannelReservesByToken(0, tokenContracts[0].address)).to.eq(0);

      const merkleTree2 = new ChannelMerkleTree([
        {
          address: account1.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 150,
        },
      ]);

      await merkleOrchardContract.setMerkleRoot(0, merkleTree2.merkleTree.getRoot());
      await merkleOrchardContract.connect(account2).fundChannel(0, tokenContracts[0].address, 100);

      const proof2 = merkleTree2.getProof(account1.address, tokenContracts[0].address, 150);
      await merkleOrchardContract.claim(0, account1.address, tokenContracts[0].address, 150, proof2);

      expect(await tokenContracts[0].balanceOf(account1.address)).to.eq(clientBalanceAfterFirstClaim.add(50));
      expect(await merkleOrchardContract.getChannelReservesByToken(0, tokenContracts[0].address)).to.eq(50);
    });

    it("reverts when cumulativeAmount is lowered in new merkle tree while it has been filled", async () => {
      const merkleTree = new ChannelMerkleTree([
        {
          address: account1.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 100,
        },
      ]);

      await merkleOrchardContract.openChannel();
      await merkleOrchardContract.setMerkleRoot(0, merkleTree.merkleTree.getRoot());
      await merkleOrchardContract.connect(account2).fundChannel(0, tokenContracts[0].address, 100);
      expect(await merkleOrchardContract.getChannelReservesByToken(0, tokenContracts[0].address)).to.eq(100);

      const clientBalanceBefore = await tokenContracts[0].balanceOf(account1.address);
      const proof = merkleTree.getProof(account1.address, tokenContracts[0].address, 100);

      await merkleOrchardContract.claim(0, account1.address, tokenContracts[0].address, 100, proof);

      const clientBalanceAfterFirstClaim = await tokenContracts[0].balanceOf(account1.address);

      expect(clientBalanceAfterFirstClaim).to.eq(clientBalanceBefore.add(100));
      expect(await merkleOrchardContract.getChannelReservesByToken(0, tokenContracts[0].address)).to.eq(0);

      const merkleTree2 = new ChannelMerkleTree([
        {
          address: account1.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 50,
        },
      ]);

      await merkleOrchardContract.setMerkleRoot(0, merkleTree2.merkleTree.getRoot());
      await merkleOrchardContract.connect(account2).fundChannel(0, tokenContracts[0].address, 100);

      const proof2 = merkleTree2.getProof(account1.address, tokenContracts[0].address, 50);
      await expect(merkleOrchardContract.claim(0, account1.address, tokenContracts[0].address, 50, proof2)).to.be
        .reverted;

      expect(await tokenContracts[0].balanceOf(account1.address)).to.eq(clientBalanceAfterFirstClaim);
      expect(await merkleOrchardContract.getChannelReservesByToken(0, tokenContracts[0].address)).to.eq(100);
    });

    it("reverts if withdrawAmount results in negative reserve", async () => {
      const merkleTree = new ChannelMerkleTree([
        {
          address: account1.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 100,
        },
        {
          address: accounts[0].address,
          token: tokenContracts[0].address,
          cumulativeAmount: 100,
        },
      ]);

      await merkleOrchardContract.openChannel();
      await merkleOrchardContract.setMerkleRoot(0, merkleTree.merkleTree.getRoot());

      const proof = merkleTree.getProof(account1.address, tokenContracts[0].address, 100);

      const clientBalanceBefore = await tokenContracts[0].balanceOf(account1.address);
      const clientBalanceBefore2 = await tokenContracts[0].balanceOf(accounts[0].address);

      await merkleOrchardContract.connect(account2).fundChannel(0, tokenContracts[0].address, 100);
      await merkleOrchardContract.claim(0, account1.address, tokenContracts[0].address, 100, proof);

      expect(await tokenContracts[0].balanceOf(account1.address)).to.eq(clientBalanceBefore.add(100));
      expect(await merkleOrchardContract.getChannelReservesByToken(0, tokenContracts[0].address)).to.eq(0);

      await merkleOrchardContract.connect(account2).fundChannel(0, tokenContracts[0].address, 20);

      const merkleTree2 = new ChannelMerkleTree([
        {
          address: account1.address,
          token: tokenContracts[0].address,
          cumulativeAmount: 120,
        },
        {
          address: accounts[0].address,
          token: tokenContracts[0].address,
          cumulativeAmount: 120,
        },
      ]);

      await merkleOrchardContract.openChannel();
      await merkleOrchardContract.setMerkleRoot(0, merkleTree2.merkleTree.getRoot());

      const proof2 = merkleTree2.getProof(accounts[0].address, tokenContracts[0].address, 120);

      // tests channel.reserves[_token] -= withdrawAmount;
      await expect(merkleOrchardContract.claim(0, accounts[0].address, tokenContracts[0].address, 120, proof2)).to.be
        .reverted;
      expect(await tokenContracts[0].balanceOf(accounts[0].address)).to.eq(clientBalanceBefore2);
    });
  });

  describe("fundChannelWithEth", async () => {
    it("funds a new channel", async () => {
      await merkleOrchardContract.connect(account1).openChannel();

      const balaceBeforeFund = await account1.getBalance();
      const fundAmount = ethers.utils.parseEther("1.0");

      await merkleOrchardContract.connect(account1).fundChannelWithEth(0, { value: fundAmount });

      expect(await merkleOrchardContract.getChannelReservesByToken(0, constants.AddressZero)).to.eq(fundAmount);
      expect(parseFloat(ethers.utils.formatEther(await account1.getBalance()))).to.be.lessThan(
        parseFloat(ethers.utils.formatEther(balaceBeforeFund.sub(fundAmount))),
      );
    });

    it("funds an existing channel", async () => {
      await merkleOrchardContract.connect(account1).openChannel();
      await merkleOrchardContract.connect(account2).openChannel();

      const fundAmount = ethers.utils.parseEther("1.0");

      await merkleOrchardContract.connect(account1).fundChannelWithEth(1, { value: fundAmount });
      await merkleOrchardContract.connect(account2).fundChannelWithEth(1, { value: fundAmount });

      expect(await merkleOrchardContract.getChannelReservesByToken(1, constants.AddressZero)).to.eq(fundAmount.mul(2));
      expect(await merkleOrchardContract.getChannelReservesByToken(0, constants.AddressZero)).to.eq(0);
    });

    it("reverts if first channel does not exist", async () => {
      const fundAmount = ethers.utils.parseEther("1.0");

      await expect(
        merkleOrchardContract.connect(account1).fundChannelWithEth(0, { value: fundAmount }),
      ).to.be.revertedWith("NonExistentTokenError()");
    });

    it("reverts if channel does not exist", async () => {
      const fundAmount = ethers.utils.parseEther("1.0");

      await merkleOrchardContract.openChannel();

      await expect(merkleOrchardContract.connect(account1).fundChannelWithEth(0, { value: fundAmount })).not.to.be
        .reverted;
      await expect(
        merkleOrchardContract.connect(account1).fundChannelWithEth(1, { value: fundAmount }),
      ).to.be.revertedWith("NonExistentTokenError()");
    });
  });

  describe("fundChannel", async () => {
    it("funds a new channel", async () => {
      await merkleOrchardContract.connect(account1).openChannel();

      await merkleOrchardContract.connect(account1).fundChannel(0, tokenContracts[0].address, 100);

      expect(await merkleOrchardContract.getChannelReservesByToken(0, tokenContracts[0].address)).to.eq(100);
    });

    it("funds an existing channel", async () => {
      await merkleOrchardContract.connect(account1).openChannel();
      await merkleOrchardContract.connect(account2).openChannel();

      await merkleOrchardContract.connect(account1).fundChannel(1, tokenContracts[0].address, 100);
      await merkleOrchardContract.connect(account2).fundChannel(1, tokenContracts[0].address, 100);

      expect(await merkleOrchardContract.getChannelReservesByToken(1, tokenContracts[0].address)).to.eq(200);
      expect(await merkleOrchardContract.getChannelReservesByToken(0, tokenContracts[0].address)).to.eq(0);
    });

    it("reverts if first channel does not exist", async () => {
      await expect(
        merkleOrchardContract.connect(account1).fundChannel(0, tokenContracts[0].address, 100),
      ).to.be.revertedWith("NonExistentTokenError()");
    });

    it("reverts if channel does not exist", async () => {
      await merkleOrchardContract.openChannel();

      await expect(merkleOrchardContract.connect(account1).fundChannel(0, tokenContracts[0].address, 100)).not.to.be
        .reverted;
      await expect(
        merkleOrchardContract.connect(account1).fundChannel(1, tokenContracts[0].address, 100),
      ).to.be.revertedWith("NonExistentTokenError()");
    });
  });
});
