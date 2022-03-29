import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import hre, { network } from "hardhat";
import TimeTraveler from "../utils/TimeTraveler";
import { parseEther } from "@ethersproject/units";

import { MerkleOrchard, MerkleOrchard__factory, MockToken, MockToken__factory } from "../src/types";

import { constants, utils } from "ethers";

describe("ERC721Module", function () {
  let deployer: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let accounts: SignerWithAddress[];
  const tokens: MockToken[] = [];
  let merkleOrchardContract: MerkleOrchard;
  const TOKEN_COUNT = 5;
  const NAME = "NAME";
  const SYMBOL = "SYMBOL";
  const BASE_TOKEN_URI = "https://example.com/";
  const MINT_AMOUNT = parseEther("1000");

  const timeTraveler = new TimeTraveler(hre.network.provider);

  before(async () => {
    [deployer, account1, account2, ...accounts] = await hre.ethers.getSigners();

    merkleOrchardContract = await new MerkleOrchard__factory(deployer).deploy(NAME, SYMBOL, BASE_TOKEN_URI);

    // for(let i = 0; i < TOKEN_COUNT; i++) {
    //     let token = await (new MockToken__factory(deployer)).deploy()
    //     tokens.push(
    //         token
    //     );

    //     await token.mint(account1.address, MINT_AMOUNT);
    //     token = token.connect(account1.address);
    //     await token.approve(orchard.address, constants.MaxUint256);
    // }

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

  describe("fundChannel", async () => {});

  describe("fundChannelWithEth", async () => {});

  describe("setMerkleRoot", async () => {});

  describe("claim", async () => {});
});
