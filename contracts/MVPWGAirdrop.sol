// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./MVPWGauntlet.sol";

/**
  Ref: https://github.com/Uniswap/merkle-distributor
 */
contract MVPWGAirdrop {
    address public immutable tokenAddress;
    bytes32 public immutable merkleRoot;

    mapping(address => bool) private addressesClaimed;

    event Claimed(address account);

    /*
    * Save ERC721 token address and merkle root has
    *
    * @param _merkleRoot - whitelisted addresses as merkle root
    * @param _tokenAddress - ERC721 token address
    *
    */
    constructor(bytes32 _merkleRoot, address _tokenAddress) {
        merkleRoot = _merkleRoot;
        tokenAddress = _tokenAddress;
    }

    /*
    * Claim ERC721 token for msg.sender
    *
    * Token could be claimed once
    * Only whitelisted address could participated in airdrop
    * Before minting verify merkle proof
    *
    */
    function claim(bytes32[] calldata merkleProof) public {
        require(!addressesClaimed[msg.sender], "Already claimed!");
        bytes32 node = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(merkleProof, merkleRoot, node), "Invalid proof.");

        MVPWGauntlet(tokenAddress).mint(msg.sender);
        addressesClaimed[msg.sender] = true;

        emit Claimed(msg.sender);
    }
}