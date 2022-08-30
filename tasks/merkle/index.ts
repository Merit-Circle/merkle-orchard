import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { task } from "hardhat/config";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import  pinataSDK from "@pinata/sdk";
import ChannelMerkleTree, { ChannelMerkleTreeEntry } from "../../utils/ChannelMerkleTree";

interface Amounts {
    [address: string]: {
        [token: string]: string;
    };
}

interface Entries {
    [address: string]: {
        [token: string]: {
            cumulativeAmount: string;
            proof: string[];
        };
    }
}

task("generate-dummy-amounts", "example: npx hardhat generate-dummy-amounts --output output.json --tokens 0x0000000000000000000000000000000000000000,0x0000000000000000000000000000000000000001,0x0000000000000000000000000000000000000002")
    .addParam("output")
    .addParam("tokens", "tokens to generate amounts for comma separated ie: 0x00000000.....11111,0x0x0000000....2222")
    .setAction(async(taskArgs, { ethers }) => {
    const signers = await ethers.getSigners();

    const amounts: Amounts = {};
    const tokens = taskArgs.tokens.split(",").map((token: string) => token.trim());

    for(let signer of signers) {
        const tokensShuffled = tokens.sort(() => 0.5 - Math.random());
        const tokensRandomSubset = tokensShuffled.slice(0, Math.floor(Math.random() * tokensShuffled.length));
        // Do nothing if there are no entries for this signer
        if(tokensRandomSubset.length === 0) {
            continue;
        }
        
        amounts[signer.address] = {};

        for(let token of tokensRandomSubset) {
            amounts[signer.address][token] = parseEther(
                (Math.random() * 1000000).toFixed(18).toString()
            ).toString();
        }
    }

    const output = JSON.stringify(amounts, null, 2);
    writeFileSync(taskArgs.output, output);
});

task("generate-cumalitive-amounts")
    .addParam("prev")
    .addParam("new")
    .addParam("output")
    .setAction(async(taskArgs, { ethers }) => {
        const prevAmounts: Amounts = JSON.parse(readFileSync(taskArgs.prev).toString());
        const newAmounts: Amounts = JSON.parse(readFileSync(taskArgs.new).toString());

        const cumalitiveAmounts: Amounts = {...prevAmounts};

        for(let address in newAmounts) {
            // If not present yet create new entry
            if(!cumalitiveAmounts[address]) {
                cumalitiveAmounts[address] = {...newAmounts[address]};
                continue;
            }
            // Otherwise add new amounts to existing entry
            for(let token in newAmounts[address]) {
                if(!cumalitiveAmounts[address][token]) {
                    cumalitiveAmounts[address][token] = newAmounts[address][token];
                    continue;
                }
                cumalitiveAmounts[address][token] = BigNumber.from(prevAmounts[address][token]).add(BigNumber.from(newAmounts[address][token])).toString();
            }
        }

        const output = JSON.stringify(cumalitiveAmounts, null, 2);
        writeFileSync(taskArgs.output, output);
});

task("generate-merkle-tree")
    .addParam("input")
    .addParam("output")
    .addFlag("seperate")
    .setAction(async(taskArgs, { ethers }) => {
        const input: Amounts = JSON.parse(readFileSync(taskArgs.input).toString());
        const merkleEntries: ChannelMerkleTreeEntry[] = [];
        
        for(let address in input) {
            for(let token in input[address]) {
                merkleEntries.push({
                    token,
                    address,
                    cumulativeAmount: input[address][token],
                });
            }
        }

        const merkleTree = new ChannelMerkleTree(merkleEntries);
        const result: Entries = {};

        for(let address in input) {
            result[address] = {};
            for(let token in input[address]) {
                result[address][token] = {
                    cumulativeAmount: input[address][token],
                    proof: merkleTree.getProof(address, token, input[address][token]),
                };
            }
        }

        if(existsSync(taskArgs.output)) {
            rmSync(taskArgs.output, { recursive: true });
        }
        mkdirSync(taskArgs.output, { recursive: true });

        await writeFile(`${taskArgs.output}/root.json`, JSON.stringify(merkleTree.merkleTree.getRoot(), null, 2));

        if(!taskArgs.seperate) {
            const output = JSON.stringify(result, null, 2);
            writeFileSync(`${taskArgs.output}/tree.json`, output);
            return;
        }
        
        const writePromises: Promise<void>[] = [];
        for(let address in result) {
            const output = JSON.stringify(result[address], null, 2);
            // console.log(output);
            writePromises.push(writeFile(`${taskArgs.output}/${address}.json`, output));
        }

        

        await Promise.all(writePromises);
});

task("pinata-pin")
    .addParam("input")
    // .addParam("ipfsNode")
    .addParam("pinataKey")
    .addParam("pinataSecret")
    .setAction(async(taskArgs, { ethers }) => {
        const files = await readdir(taskArgs.input);
        const pinata = pinataSDK(taskArgs.pinataKey, taskArgs.pinataSecret);
        const response = await pinata.pinFromFS(taskArgs.input);

        console.log(response);
});
