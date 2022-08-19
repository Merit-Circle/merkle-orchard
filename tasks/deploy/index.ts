import { task } from "hardhat/config";
import { sleep } from "../../utils/sleep";

const VERIFY_DELAY = 100000;

task("deploy")
  .addParam("name")
  .addParam("symbol")
  .addParam("basetokenuri")
  .addFlag("verify")
  .setAction(async (taskArgs, { ethers, run }) => {
    const signers = await ethers.getSigners();
    const merkleOrchardFactory = await ethers.getContractFactory("MerkleOrchard");
    const merkleOrchard = await merkleOrchardFactory
      .connect(signers[0])
      .deploy(taskArgs.name, taskArgs.symbol, taskArgs.basetokenuri);

    console.log(`MerkleOrchard deployed at: ${merkleOrchard.address}`);

    if (taskArgs.verify) {
      console.log("Verifying, can take some time");
      await merkleOrchard.deployed();
      await sleep(VERIFY_DELAY);
      await run("verify:verify", {
        address: merkleOrchard.address,
        constructorArguments: [taskArgs.name, taskArgs.symbol, taskArgs.basetokenuri],
      });
    }
  });
