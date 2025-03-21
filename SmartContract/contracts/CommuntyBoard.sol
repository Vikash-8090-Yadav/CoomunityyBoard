// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract CommunityBountyBoard is Ownable {
    using SafeERC20 for IERC20;
    constructor() Ownable() { }

    // Structs
    struct Bounty {
        uint256 id;
        address creator;
        string title;
        string description;
        string proofRequirements;
        uint256 reward;
        address rewardToken; // Address of ERC20 token or zero address for native currency
        uint256 deadline;
        bool completed;
        address winner;
        string ipfsProofHash; // Hash of the proof submitted by the winner
        uint256 approvalCount;
        mapping(address => bool) hasVoted;
    }

    // State variables
    uint256 public bountyCount;
    uint256 public minimumApprovals = 3; // Minimum votes needed to approve a bounty
    mapping(uint256 => Bounty) public bounties;
    mapping(address => uint256) public userReputation;

    // Events
    event BountyCreated(uint256 indexed bountyId, address indexed creator, string title, uint256 reward);
    event ProofSubmitted(uint256 indexed bountyId, address indexed submitter, string ipfsProofHash);
    event BountyApproved(uint256 indexed bountyId, address indexed approver);
    event BountyCompleted(uint256 indexed bountyId, address indexed winner, uint256 reward);
    event BountyCanceled(uint256 indexed bountyId, address indexed creator);

    // Create a new bounty
    function createBounty(
        string memory _title,
        string memory _description,
        string memory _proofRequirements,
        uint256 _reward,
        address _rewardToken,
        uint256 _deadline
    ) external payable returns (uint256) {
        require(_deadline > block.timestamp, "Deadline must be in the future");

        uint256 bountyId = bountyCount++;
        Bounty storage newBounty = bounties[bountyId];

        newBounty.id = bountyId;
        newBounty.creator = msg.sender;
        newBounty.title = _title;
        newBounty.description = _description;
        newBounty.proofRequirements = _proofRequirements;
        newBounty.reward = _reward;
        newBounty.rewardToken = _rewardToken;
        newBounty.deadline = _deadline;

        // Transfer reward to contract
        if (_rewardToken == address(0)) {
            // Native currency (ETH/MATIC/etc.)
            require(msg.value == _reward, "Must send exact reward amount");
        } else {
            // ERC20 token
            IERC20(_rewardToken).safeTransferFrom(msg.sender, address(this), _reward);
        }

        emit BountyCreated(bountyId, msg.sender, _title, _reward);
        return bountyId;
    }

    // Submit proof of task completion
    function submitProof(uint256 _bountyId, string memory _ipfsProofHash) external {
        Bounty storage bounty = bounties[_bountyId];

        require(!bounty.completed, "Bounty already completed");
        require(block.timestamp <= bounty.deadline, "Bounty deadline has passed");

        bounty.ipfsProofHash = _ipfsProofHash;
        bounty.winner = msg.sender;

        emit ProofSubmitted(_bountyId, msg.sender, _ipfsProofHash);
    }

    // Vote to approve a submission
    function approveSubmission(uint256 _bountyId) external {
        Bounty storage bounty = bounties[_bountyId];

        require(!bounty.completed, "Bounty already completed");
        require(bounty.winner != address(0), "No submission to approve");
        require(!bounty.hasVoted[msg.sender], "Already voted");
        require(msg.sender != bounty.winner, "Cannot approve own submission");

        bounty.hasVoted[msg.sender] = true;
        bounty.approvalCount++;

        emit BountyApproved(_bountyId, msg.sender);

        // Check if enough approvals to complete bounty
        if (bounty.approvalCount >= minimumApprovals) {
            completeBounty(_bountyId);
        }
    }

    // Complete bounty and distribute rewards
    function completeBounty(uint256 _bountyId) internal {
        Bounty storage bounty = bounties[_bountyId];

        bounty.completed = true;

        // Increase reputation
        userReputation[bounty.winner] += 10;
        userReputation[bounty.creator] += 5;

        // Transfer reward
        if (bounty.rewardToken == address(0)) {
            // Native currency
            payable(bounty.winner).transfer(bounty.reward);
        } else {
            // ERC20 token
            IERC20(bounty.rewardToken).safeTransfer(bounty.winner, bounty.reward);
        }

        emit BountyCompleted(_bountyId, bounty.winner, bounty.reward);
    }

    // Allow creator to cancel bounty before deadline and if no submissions
    function cancelBounty(uint256 _bountyId) external {
        Bounty storage bounty = bounties[_bountyId];

        require(msg.sender == bounty.creator, "Only creator can cancel");
        require(!bounty.completed, "Bounty already completed");
        require(bounty.winner == address(0), "Cannot cancel after submission");

        // Return funds to creator
        if (bounty.rewardToken == address(0)) {
            // Native currency
            payable(bounty.creator).transfer(bounty.reward);
        } else {
            // ERC20 token
            IERC20(bounty.rewardToken).safeTransfer(bounty.creator, bounty.reward);
        }

        // Mark as completed to prevent further interaction
        bounty.completed = true;

        emit BountyCanceled(_bountyId, bounty.creator);
    }

    // Allow DAO/community to adjust minimum approval threshold
    function setMinimumApprovals(uint256 _minimumApprovals) external onlyOwner {
        require(_minimumApprovals > 0, "Minimum approvals must be greater than 0");
        minimumApprovals = _minimumApprovals;
    }

    // Helper functions for frontend
    function getBountyDetails(uint256 _bountyId) external view returns (
        address creator,
        string memory title,
        string memory description,
        string memory proofRequirements,
        uint256 reward,
        address rewardToken,
        uint256 deadline,
        bool completed,
        address winner,
        string memory ipfsProofHash,
        uint256 approvalCount
    ) {
        Bounty storage bounty = bounties[_bountyId];

        return (
            bounty.creator,
            bounty.title,
            bounty.description,
            bounty.proofRequirements,
            bounty.reward,
            bounty.rewardToken,
            bounty.deadline,
            bounty.completed,
            bounty.winner,
            bounty.ipfsProofHash,
            bounty.approvalCount
        );
    }

    // Check if a user has voted on a specific bounty
    function hasVotedOnBounty(uint256 _bountyId, address _user) external view returns (bool) {
        return bounties[_bountyId].hasVoted[_user];
    }
}