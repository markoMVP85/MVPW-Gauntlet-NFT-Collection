// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract MVPWGauntlet is ERC721URIStorage, AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    Counters.Counter private tokenIDCounter;

    constructor() ERC721 ("MVPWGauntlet", "MVPWG") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
    * Builds token uri
    *
    * @param _ipfsAddress - IPFS address
    * @param _tokenTitle - Title of token
    *
    * @return JSON encoded string
    */
    function formatTokenURI(string memory _ipfsAddress, string memory _tokenTitle) private view returns (string memory) {
        uint256 tokenID = tokenIDCounter.current();
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(
                    bytes(
                        abi.encodePacked(
                            '{',
                            '"name": "MVPW Gauntlet #', Strings.toString(tokenID), '",',
                            '"image": "ipfs://', _ipfsAddress ,'",',
                            '"attributes": [{ "trait_type": "Token name", "value": "', _tokenTitle ,'" }]',
                            '}'
                        )
                    )
                )
            )
        );
    }

    /**
    * Mints new token for msg.sender
    */
    function mint(address _address) public onlyRole(MINTER_ROLE) {
        require(_address != address(0), "Invalid address");
        uint256 currentTokenID = tokenIDCounter.current();

        super._safeMint(_address, currentTokenID);
        super._setTokenURI(currentTokenID, formatTokenURI('bafkreicbkftsc4s22oxprpvsl5uaaf4cpfks3w4zzvray7jyqjzt4fwyva', 'Web3FM'));

        tokenIDCounter.increment();
    }

    /*
    * Solidity requires
    */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}