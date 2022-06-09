# Merkle Orchard

Merkle Orchard is a set of smart contracts that provide an infraestructure to collect and distribute fees generated by different sources of income of the protocol. 

The main idea behind this contracts is to use channels as vehicles to collect and distribute the fees. The channels are ERC721 tokens that can be transfered, each with an id. The channels mapping of channel structs provides the capability of accounting the reserves, withdrawls and storing the merkle root for the claims.

It is important to remark that this contracts can have a future usege in other sources of fees that Merit Circle can come up with.

## Contracts

In this section we detail a few of the core contracts in Merkle Orchard repository.

<dl>
  <dt>MerkleOrchard</dt>
  <dd>This smart contract contains the channel structs and is in charge of the logic of opening new channels, funding them, and claiming from them. OpenZeppelin MerkleProof contract is inherited and manages the verification in the claim function using the Merkle root of the channel.
  </dd>
</dl>
<dl>
  <dt>IMerkleOrchard</dt>
  <dd>Interface of the MerkleOrchard contract used to push fees by other Merit Circle smart contracts.
  </dd>
</dl>
<dl>
  <dt>OpenZeppelin dependencies</dt>
  <dd>ERC721Enumerable: imported to use the ERC721 token standard to mint channels and include the enumerable interface which contains the totalSupply function.
  MerkleProof: used to verify if the claimer of funds is included in the merkle tree.
  SafeERC20: imported to bring security when interacting with ERC20 by using the safeTransferFrom and safeTransfer functions.
  IERC20: used to provide the needed interface to interact with ERC20 tokens.
  </dd>
</dl>

## Usage

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
$ yarn deploy --greeting "Bonjour, le monde!"
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
