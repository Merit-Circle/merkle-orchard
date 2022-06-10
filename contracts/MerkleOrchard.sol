// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IMerkleOrchard.sol";

// solhint-disable-next-line
// Inpsired by https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/distributors/contracts/MerkleOrchard.sol

/**
 * @title Merito's Merkle Orchard Contract
 * @author Merit Circle
 * @notice Contract that provides the logic to collect and distribute fees.
 * @dev Uses ERC721 to create channels to manage the fee collection and distribution (claim) with help of Merkle Trees.
 */
contract MerkleOrchard is ERC721Enumerable, IMerkleOrchard {
    using SafeERC20 for IERC20;
    string internal baseTokenURI;

    error MerkleProofError();
    error NotOwnerError();
    error NonExistentTokenError();
    error CallNotSuccessfulError();

    event MerkleRootUpdated(uint256 indexed channelId, bytes32 indexed merkleRoot, string indexed ipfsHash);
    event ChannelFunded(uint256 indexed channelId, address indexed token);
    event ChannelFundedWithETH(uint256 indexed channelId);
    event TokenClaimed(uint256 indexed channelId, address indexed receiver, address indexed token);

    struct Channel {
        mapping(address => uint256) reserves;
        // token => account => amount
        mapping(address => mapping(address => uint256)) withdraws;
        bytes32 merkleRoot;
    }

    mapping(uint256 => Channel) public channels;

    /**
     * @notice Sets the main external variables.
     * @dev On deployments sets the name, symbol and URI of the token.
     * @param _name String name of the token.
     * @param _symbol String of the symbol of the token.
     * @param _baseTokenURI String of the URI.
     */
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseTokenURI
    ) ERC721(_name, _symbol) {
        baseTokenURI = _baseTokenURI;
    }

    /**
     * @notice Opens a new channel.
     * @dev Message sender receives the new channel as an NFT with the Id of the total supply of NFTs in the contract.
     */
    function openChannel() external {
        _mint(msg.sender, totalSupply());
    }

    /**
     * @notice Provides a channel with an amount of tokens.
     * @dev If the channel exists, an amount of tokens are transfered to the contract, accounting
     * that tokens in the specified channel reserves. Emits an event with the channel and token used.
     * @param _channelId Number of the channel id.
     * @param _token Address of token used to fund the channel.
     * @param _amount Number of tokens to send to the channel.
     */
    function fundChannel(
        uint256 _channelId,
        address _token,
        uint256 _amount
    ) external {
        if (_channelId >= totalSupply()) {
            revert NonExistentTokenError();
        }

        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        channels[_channelId].reserves[_token] += _amount;
        emit ChannelFunded(_channelId, _token);
    }

    /**
     * @notice Gets the amount of token reserves in a certain channel.
     * @dev Gets the amount of token reserves in a certain channel.
     * @param _channelId Number of the channel id.
     * @param _token Address of token used to fund the channel.
     * @return Number of reserves in the channel of certain token.
     */
    function getChannelReservesByToken(uint256 _channelId, address _token) public view returns (uint256) {
        return channels[_channelId].reserves[_token];
    }

    /**
     * @notice Provides a channel with an amount of ETH.
     * @dev If the channel exists, an amount of ETH is sent to the contract, accounting
     * that ETH in the specified channel reserves. Emits an event with the channel funded.
     * @param _channelId Number of the channel id.
     */
    function fundChannelWithEth(uint256 _channelId) external payable {
        if (_channelId >= totalSupply()) {
            revert NonExistentTokenError();
        }

        channels[_channelId].reserves[address(0)] += msg.value;
        emit ChannelFundedWithETH(_channelId);
    }

    /**
     * @notice Function to set the merkle root of a certain channel.
     * @dev Sets the Merkle Root and the corresponding IPFS hash.
     * @param _channelId Number of the channel id.
     * @param _merkleRoot Bytes32 of the merkle root of the channel.
     * @param _ipfsHash IPFS hash where the merkle tree is stored.
     */
    function setMerkleRoot(
        uint256 _channelId,
        bytes32 _merkleRoot,
        string memory _ipfsHash
    ) external {
        if (ownerOf(_channelId) != msg.sender) {
            revert NotOwnerError();
        }

        channels[_channelId].merkleRoot = _merkleRoot;
        emit MerkleRootUpdated(_channelId, _merkleRoot, _ipfsHash);
    }

    /**
     * @notice Function that retrieves the Merkle Root of requested channel.
     * @dev Function that retrieves the Merkle Root of requested channel.
     * @param _channelId Number of the channel id.
     * @return Bytes32 Merkle Root of the requested channel.
     */
    function getMerkleRoot(uint256 _channelId) public view returns (bytes32) {
        return channels[_channelId].merkleRoot;
    }

    /**
     * @notice Function for claiming the balance of the channel to a specified address that is in the merkle tree.
     * @dev Claim entire balance of channel.
     * @param _channelId Number of the channel id.
     * @param _receiver Address of token used to fund the channel.
     * @param _token Address
     * @param _cumulativeAmount Address
     * @param _proof Address
     */
    function claim(
        uint256 _channelId,
        address _receiver,
        address _token,
        uint256 _cumulativeAmount,
        bytes32[] calldata _proof
    ) external {
        Channel storage channel = channels[_channelId];

        // Checks
        bytes32 leaf = keccak256(abi.encodePacked(_receiver, _token, _cumulativeAmount));
        if (!MerkleProof.verify(_proof, channel.merkleRoot, leaf)) {
            revert MerkleProofError();
        }

        // Effects
        uint256 withdrawnPreviously = channel.withdraws[_token][_receiver];
        uint256 withdrawAmount = _cumulativeAmount - withdrawnPreviously;
        channel.withdraws[_token][_receiver] = _cumulativeAmount;
        channel.reserves[_token] -= withdrawAmount;

        // Interactions
        // IF ETH
        if (_token == address(0)) {
            // solhint-disable-next-line
            (bool success, ) = payable(_receiver).call{ value: withdrawAmount }("");
            if (!success) {
                revert CallNotSuccessfulError();
            }
        } else {
            IERC20(_token).safeTransfer(_receiver, withdrawAmount);
        }
        emit TokenClaimed(_channelId, _receiver, _token);
    }

    /**
     * @notice Returns the baseURI.
     * @dev Internal function that overrides OpenZeppelin's function.
     * @return The tokenURI.
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    /**
     * @notice Returns the baseURI.
     * @dev Returns the baseURI.
     * @return The tokenURI.
     */
    function baseURI() external view returns (string memory) {
        return _baseURI();
    }
}
