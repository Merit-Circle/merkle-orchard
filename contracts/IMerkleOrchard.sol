// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

/**
 * @title Merito's Merkle Orchard Interface Contract
 * @author Merit Circle
 * @notice Contract that provides the interface to the Merkle Orchard contract.
 * @dev This interface provides channel funding (with ETH and tokens), merkle root setting and claiming functions.
 */
interface IMerkleOrchard is IERC721Enumerable {
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
    ) external;

    /**
     * @notice Provides a channel with an amount of ETH.
     * @dev If the channel exists, an amount of ETH is sent to the contract, accounting
     * that ETH in the specified channel reserves. Emits an event with the channel funded.
     * @param _channelId Number of the channel id.
     */
    function fundChannelWithEth(uint256 _channelId) external payable;

    /**
     * @notice Function to set the merkle root of a certain channel.
     * @dev Sets the Merkle Root and the corresponding IPFS hash.
     * @param _channelId Number of the channel id.
     * @param _merkleRoot Bytes32 of the merkle root of the channel.
     * @param _ipfsHash IPFS hash where the merkle root is stored.
     */
    function setMerkleRoot(
        uint256 _channelId,
        bytes32 _merkleRoot,
        string memory _ipfsHash
    ) external;

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
    ) external;
}
