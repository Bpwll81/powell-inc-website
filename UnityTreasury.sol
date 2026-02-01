// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// --- XSWAP ROUTER INTERFACE ---
interface IUniswapV2Router02 {
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}

/**
 * @title Unity Protocol Treasury
 * @notice Holds ~88% of supply. Manages Liquidity, Investor Rounds, and Founder Vesting.
 */
contract UnityTreasury is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable unityToken;
    IUniswapV2Router02 public immutable router;

    // --- ALLOCATIONS (Total Supply: 70 Billion) ---
    
    // 1. Founder Allocation (1.75% = 1,225,000,000 UNT)
    uint256 public constant FOUNDER_TOTAL_ALLOCATION = 1_225_000_000 * 1e18; 
    
    // 2. Private Investor Reserve (10.00% = 7,000,000,000 UNT)
    // Reserved for OTC deals to raise capital without hurting chart.
    uint256 public constant INVESTOR_ALLOCATION = 7_000_000_000 * 1e18; 
    
    // 3. Operational Runway (Immediate Release from Founder's Cut)
    // 20 Million UNT (~$100k value) released Day 1 for private sale/expenses.
    uint256 public constant FOUNDER_INITIAL_RELEASE = 20_000_000 * 1e18;

    // The remaining ~61 Billion stays here for Liquidity Bonding.

    // --- STATE VARIABLES ---
    address public founderWallet;
    address public investorWallet; 
    
    uint256 public launchTimestamp;
    bool public genesisDistributed = false;
    
    // Tracks how much the founder has claimed so far
    uint256 public founderClaimed;

    constructor(
        address _token, 
        address _router, 
        address _founder, 
        address _investorCustody
    ) Ownable(msg.sender) {
        unityToken = IERC20(_token);
        router = IUniswapV2Router02(_router);
        founderWallet = _founder;
        investorWallet = _investorCustody;
    }

    // ==========================================
    // STEP 1: GENESIS (Day 1 Distribution)
    // ==========================================
    function distributeGenesis() external onlyOwner {
        require(!genesisDistributed, "Already distributed");
        require(unityToken.balanceOf(address(this)) >= 70_000_000_000 * 1e18, "Treasury empty");
        
        // 1. Send 10% to Private Investor Custody Wallet
        unityToken.safeTransfer(investorWallet, INVESTOR_ALLOCATION);

        // 2. Send Immediate "Runway" Tokens to Founder (20M)
        unityToken.safeTransfer(founderWallet, FOUNDER_INITIAL_RELEASE);
        founderClaimed = FOUNDER_INITIAL_RELEASE; 

        // 3. Start the Clock
        launchTimestamp = block.timestamp; 
        genesisDistributed = true;
    }

    // ==========================================
    // STEP 2: FOUNDER VESTING (The 4-Month Cliff)
    // ==========================================
    /**
     * @notice Releases 5% of the Founder's Total Allocation AFTER Month 4.
     */
    function claimFounderCliff() external {
        require(msg.sender == founderWallet, "Only founder");
        require(genesisDistributed, "Not launched");
        
        // Rule: Must be 120 Days (4 Months) after Genesis
        require(block.timestamp >= launchTimestamp + 120 days, "Still in 4-month cliff");
        
        // Target: The Initial Release + 5% of the Total Allocation
        uint256 firstTranche = (FOUNDER_TOTAL_ALLOCATION * 5) / 100; 
        uint256 totalTarget = firstTranche + FOUNDER_INITIAL_RELEASE;

        require(founderClaimed < totalTarget, "Cliff already claimed");

        uint256 amountToRelease = totalTarget - founderClaimed;
        founderClaimed = totalTarget;

        unityToken.safeTransfer(founderWallet, amountToRelease);
    }

    // ==========================================
    // STEP 3: LIQUIDITY LAUNCH ($85k Grant)
    // ==========================================
    function launchLiquidity() external payable onlyOwner {
        require(genesisDistributed, "Run Genesis first");
        require(msg.value > 0, "Must provide XDC Grant Funds");

        // The Magic Number: 17 Million UNT pairs with $85k to equal $0.005
        uint256 amountUNT = 17_000_000 * 1e18;

        unityToken.approve(address(router), amountUNT);
        
        // Add to XSwap
        router.addLiquidityETH{value: msg.value}(
            address(unityToken), 
            amountUNT, 
            0, // Min Token (0 for launch simplicity)
            0, // Min ETH (0 for launch simplicity)
            msg.sender, // LP Tokens go to You
            block.timestamp + 300
        );
    }

    // ==========================================
    // STEP 4: FUTURE GROWTH
    // ==========================================
    function bondLiquidity(uint256 untAmount) external payable onlyOwner {
        require(genesisDistributed, "Run Genesis first");
        unityToken.approve(address(router), untAmount);
        router.addLiquidityETH{value: msg.value}(
            address(unityToken), untAmount, 0, 0, msg.sender, block.timestamp + 300
        );
    }
}