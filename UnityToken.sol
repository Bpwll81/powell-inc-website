// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Unity Protocol Token (UNT)
 * @dev Standard ERC20 Token with a fixed supply of 70 Billion.
 * All tokens are initially minted to the deployer, then moved to the Treasury.
 */
contract UnityToken is ERC20, Ownable {
    
    // 70 Billion Tokens (with 18 decimals)
    uint256 private constant INITIAL_SUPPLY = 70_000_000_000 * 10**18;

    constructor() ERC20("Unity Protocol", "UNT") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}