# Merkle Orchard

TBD

## Usage

### Generating random drops for testing

```sh
npx hardhat generate-dummy-amounts --output output2.json --tokens 0x0000000000000000000000000000000000000000,0x0000000000000000000000000000000000000001,0x0000000000000000000000000000000000000002
```

### Generate cumalative amounts from previous drops

```sh
npx hardhat generate-cummalitive-amounts --prev prev.json --new new.json --output cummalative.json
```

### Generating merle tree files

```sh
# Seperate files for each address
npx hardhat generate-merkle-tree --input output.json --output tree --seperate
# One file with all the proofs
npx hardhat generate-merkle-tree --input output.json --output tree
```

### Uploading to ipfs through pinata
```sh
npx hardhat pinata-pin --input ./tree --pinata-key PINATA_KEY --pinata-secret PINATA_SECRET
```


### Pre Requisites

Before running any command, you need to create a `.env` file and set a BIP-39 compatible mnemonic as an environment
variable. Follow the example in `.env.example`. If you don't already have a mnemonic, use this [website](https://iancoleman.io/bip39/) to generate one.

Then, proceed with installing dependencies:

```sh
yarn install
```

### Compile

Compile the smart contracts with Hardhat:

```sh
$ yarn compile
```

### TypeChain

Compile the smart contracts and generate TypeChain artifacts:

```sh
$ yarn typechain
```

### Lint Solidity

Lint the Solidity code:

```sh
$ yarn lint:sol
```

### Lint TypeScript

Lint the TypeScript code:

```sh
$ yarn lint:ts
```

### Test

Run the Mocha tests:

```sh
$ yarn test
```

### Coverage

Generate the code coverage report:

```sh
$ yarn coverage
```

### Report Gas

See the gas usage per unit test and average gas per method call:

```sh
$ REPORT_GAS=true yarn test
```

### Clean

Delete the smart contract artifacts, the coverage reports and the Hardhat cache:

```sh
$ yarn clean
```

### Deploy

Deploy the contracts to Hardhat Network:

```sh
npx hardhat deploy --network rinkeby --name "MerkleOrchard" --symbol "MRKO" --basetokenuri ""  --verify
```

## Syntax Highlighting

If you use VSCode, you can enjoy syntax highlighting for your Solidity code via the
[vscode-solidity](https://github.com/juanfranblanco/vscode-solidity) extension. The recommended approach to set the
compiler version is to add the following fields to your VSCode user settings:

```json
{
  "solidity.compileUsingRemoteVersion": "v0.8.4+commit.c7e474f2",
  "solidity.defaultCompiler": "remote"
}
```

Where of course `v0.8.4+commit.c7e474f2` can be replaced with any other version.
