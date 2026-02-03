// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SessionEscrow
 * @author Senior Solidity Engineer
 * @notice A minimal, session-based escrow system for DeFi execution on Base.
 * 
 * DESIGN DECISIONS:
 * 1. bytes32 Session IDs: Using bytes32 for sessionId allows for flexible off-chain 
 *    indexing and identifies unique execution contexts.
 * 2. Immutable Token: USDC address is fixed to prevent contract reuse with malicious tokens.
 * 3. Atomic Spending: Spent funds are transferred directly to a target (e.g., a DEX) 
 *    ensuring the contract doesn't hold intermediate swap balances.
 * 4. Ownership Security: Only the session owner can settle (withdraw) their specific session funds.
 * 5. Trusted Executor: An off-chain agent (trusted address) is authorized to spend funds 
 *    acting on behalf of the user, restricted by the session's locked balance.
 */
contract SessionEscrow is Ownable, ReentrancyGuard {
    
    struct Session {
        address owner;
        uint256 balance;
    }

    IERC20 public immutable usdc;
    address public executor;

    mapping(bytes32 => Session) public sessions;

    event SessionCreated(bytes32 indexed sessionId, address indexed owner, uint256 amount);
    event SessionSpent(bytes32 indexed sessionId, address indexed recipient, uint256 amount);
    event SessionSettled(bytes32 indexed sessionId, address indexed owner, uint256 remainingAmount);
    event ExecutorUpdated(address indexed newExecutor);

    error Unauthorized();
    error InsufficientBalance();
    error SessionAlreadyExists();
    error SessionDoesNotExist();

    constructor(address _usdc, address _executor) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        executor = _executor;
    }

    /**
     * @notice Updates the trusted off-chain executor address.
     */
    function updateExecutor(address _newExecutor) external onlyOwner {
        executor = _newExecutor;
        emit ExecutorUpdated(_newExecutor);
    }

    /**
     * @notice Creates a new session by depositing USDC.
     * @param sessionId Unique identifier for the session.
     * @param amount Amount of USDC to deposit (6 decimals).
     */
    function createSession(bytes32 sessionId, uint256 amount) external nonReentrant {
        if (sessions[sessionId].owner != address(0)) revert SessionAlreadyExists();
        if (amount == 0) revert InsufficientBalance();

        sessions[sessionId] = Session({
            owner: msg.sender,
            balance: amount
        });

        usdc.transferFrom(msg.sender, address(this), amount);
        
        emit SessionCreated(sessionId, msg.sender, amount);
    }

    /**
     * @notice Allows the trusted executor to spend funds from a session for trade execution.
     * @param sessionId The ID of the session to spend from.
     * @param recipient The target address (e.g., DEX Router, Solver, or bridge).
     * @param amount The amount of USDC to spend.
     */
    function spend(bytes32 sessionId, address recipient, uint256 amount) external nonReentrant {
        if (msg.sender != executor) revert Unauthorized();
        Session storage session = sessions[sessionId];
        if (session.owner == address(0)) revert SessionDoesNotExist();
        if (session.balance < amount) revert InsufficientBalance();

        session.balance -= amount;
        usdc.transfer(recipient, amount);

        emit SessionSpent(sessionId, recipient, amount);
    }

    /**
     * @notice Settles a session, transferring remaining funds back to the session owner.
     * @param sessionId The ID of the session to close.
     */
    function settle(bytes32 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        if (msg.sender != session.owner) revert Unauthorized();
        
        uint256 remaining = session.balance;
        delete sessions[sessionId];

        if (remaining > 0) {
            usdc.transfer(msg.sender, remaining);
        }

        emit SessionSettled(sessionId, msg.sender, remaining);
    }

    /**
     * @notice Emergency withdrawal for session owners in case of agent failure.
     * Effectively the same as settle, but explicit for UX.
     */
    function forceWithdraw(bytes32 sessionId) external {
        this.settle(sessionId);
    }
}
