// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Inpsired by https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/distributors/contracts/MerkleOrchard.sol

contract MerkleOrchard is ERC721Enumerable {
    using SafeERC20 for IERC20;
    string internal baseTokenURI;

    error MerkleProofError();
    error NotOwnerError();

    struct Channel {
        mapping(address => uint256) reserves;
        // token => account => amount
        mapping(address => mapping(address => uint256)) withdraws;
        bytes32 merkleRoot;
    }

    Channel[] public channels;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseTokenURI
    ) ERC721(_name, _symbol) {
        baseTokenURI = _baseTokenURI;
    }

    function openChannel() external {
        _mint(msg.sender, totalSupply());
    }

    // TODO support ETH
    function fundChannel(
        uint256 _channelId,
        address _token,
        uint256 _amount
    ) external {
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        channels[_channelId].reserves[_token] += _amount;
    }

    function fundChannelWithEth(uint256 _channelId) external payable {
        channels[_channelId].reserves[address(0)] += msg.value;
    }

    function setMerkleRoot(uint256 _channelId, bytes32 _merkleRoot) external {
        if (ownerOf(_channelId) != msg.sender) {
            revert NotOwnerError();
        }

        channels[_channelId].merkleRoot = _merkleRoot;
    }

    function claim(
        uint256 _channelId,
        address _receiver,
        address _token,
        uint256 _cumalativeAmount,
        bytes32[] calldata _proof
    ) external {
        Channel storage channel = channels[_channelId];

        // Checks
        bytes32 leaf = keccak256(abi.encodePacked(_receiver, _token, _cumalativeAmount));
        if (!MerkleProof.verify(_proof, channel.merkleRoot, leaf)) {
            revert NotOwnerError();
        }

        // Effects
        uint256 withdrawnPreviously = channel.withdraws[_token][_receiver];
        uint256 withdrawAmount = _cumalativeAmount - withdrawnPreviously;
        channel.withdraws[_token][_receiver] = _cumalativeAmount;
        channel.reserves[_token] -= withdrawAmount;

        // Interactions
        // IF ETH
        if (_token == address(0)) {
            payable(_receiver).call{ value: withdrawAmount }("");
            return;
        }
        IERC20(_token).safeTransfer(_receiver, withdrawAmount);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    /// @notice returns the baseURI
    /// @return The tokenURI
    function baseURI() external view returns (string memory) {
        return _baseURI();
    }
}