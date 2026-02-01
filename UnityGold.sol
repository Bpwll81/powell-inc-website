// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Unity Gold (UGLD)
 * @dev 1 Token = 1 Fine Troy Ounce of Gold.
 * Minting requires Physical Audit Reference.
 */
contract UnityGold is ERC20, AccessControl {
    
    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");

    // Events for Transparency
    event GoldMinted(address indexed vault, uint256 amount, string auditRef);
    event GoldBurned(address indexed user, uint256 amount, string deliveryDetails);

    constructor(address _initialVaultManager) ERC20("Unity Gold", "UGLD") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VAULT_MANAGER_ROLE, _initialVaultManager);
    }

    /**
     * @notice Mint UGLD. ONLY call this when Physical Gold is confirmed in Vault.
     * @param auditRef The Vault Receipt ID (e.g. "Receipt-001").
     */
    function mintBackedGold(address to, uint256 amount, string memory auditRef) external onlyRole(VAULT_MANAGER_ROLE) {
        _mint(to, amount);
        emit GoldMinted(to, amount, auditRef);
    }

    /**
     * @notice Burn UGLD to redeem physical metal (Phase 4).
     */
    function burnForPhysical(uint256 amount, string memory deliveryDetails) external {
        _burn(msg.sender, amount);
        emit GoldBurned(msg.sender, amount, deliveryDetails);
    }
}