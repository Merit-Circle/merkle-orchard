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
  let orchard: MerkleOrchard;
  const TOKEN_COUNT = 5;
  const NAME = "NAME";
  const SYMBOL = "SYMBOL";
  const BASE_TOKEN_URI = "https://example.com/";
  const MINT_AMOUNT = parseEther("1000");

  const timeTraveler = new TimeTraveler(hre.network.provider);
  before(async () => {
    [deployer, account1, account2, ...accounts] = await hre.ethers.getSigners();

    orchard = await new MerkleOrchard__factory(deployer).deploy(NAME, SYMBOL, BASE_TOKEN_URI);

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

    // await timeTraveler.snapshot();
  });

  beforeEach(async () => {
    await timeTraveler.revertSnapshot();
  });

  describe("openChannel", async () => {
    it("should work", async () => {
      // const balanceBefore = await orchard.balanceOf(account1.address);
      // const totalSupplyBefore = await orchard.totalSupply();
      // await orchard.openChannel();
      // const balanceAfter = await orchard.balanceOf(account1.address);
      // const totalSupplyAfter = await orchard.totalSupply();
      // expect(balanceAfter).to.eq(balanceBefore.add(1));
      // expect(totalSupplyAfter).to.eq(totalSupplyBefore.add(1));
    });
  });

  describe("fundChannel", async () => {});

  describe("fundChannelWithEth", async () => {});

  describe("setMerkleRoot", async () => {});

  describe("claim", async () => {});
});
