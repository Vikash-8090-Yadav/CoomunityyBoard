// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract CommunityBountyBoard is Ownable {
    using SafeERC20 for IERC20;
    constructor() Ownable() { }

    // Structs
    struct Submission {
        address submitter;
        string ipfsProofHash;
        uint256 timestamp;
        bool approved;
        uint256 approvalCount;
        mapping(address => bool) hasVoted;
    }

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
        uint256 submissionCount;
        mapping(uint256 => Submission) submissions;
    }

    // State variables
    uint256 public bountyCount;
    uint256 public minimumApprovals = 3; // Minimum votes needed to approve a bounty
    mapping(uint256 => Bounty) public bounties;
    mapping(address => uint256) public userReputation;
    mapping(address => uint256[]) private userBounties; // Bounties created by user
    mapping(address => uint256[]) private userSubmissions; // Bounty IDs where user has submitted

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
        newBounty.submissionCount = 0;

        // Add to user's bounties
        userBounties[msg.sender].push(bountyId);

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

        uint256 submissionId = bounty.submissionCount++;
        Submission storage submission = bounty.submissions[submissionId];
        submission.submitter = msg.sender;
        submission.ipfsProofHash = _ipfsProofHash;
        submission.timestamp = block.timestamp;
        submission.approvalCount = 0;

        // Add to user's submissions
        userSubmissions[msg.sender].push(_bountyId);

        emit ProofSubmitted(_bountyId, msg.sender, _ipfsProofHash);
    }

    // Vote to approve a submission
    function approveSubmission(uint256 _bountyId, uint256 _submissionId) external {
        Bounty storage bounty = bounties[_bountyId];
        require(_submissionId < bounty.submissionCount, "Invalid submission ID");
        Submission storage submission = bounty.submissions[_submissionId];

        require(!bounty.completed, "Bounty already completed");
        require(!submission.hasVoted[msg.sender], "Already voted");
        require(msg.sender != submission.submitter, "Cannot approve own submission");

        submission.hasVoted[msg.sender] = true;
        submission.approvalCount++;

        emit BountyApproved(_bountyId, msg.sender);

        // Check if enough approvals to complete bounty
        if (submission.approvalCount >= minimumApprovals) {
            completeBounty(_bountyId, _submissionId);
        }
    }

    // Complete bounty and distribute rewards
    function completeBounty(uint256 _bountyId, uint256 _submissionId) internal {
        Bounty storage bounty = bounties[_bountyId];
        Submission storage submission = bounty.submissions[_submissionId];

        bounty.completed = true;
        bounty.winner = submission.submitter;
        submission.approved = true;

        // Increase reputation
        userReputation[submission.submitter] += 10;
        userReputation[bounty.creator] += 5;

        // Transfer reward
        if (bounty.rewardToken == address(0)) {
            // Native currency
            payable(submission.submitter).transfer(bounty.reward);
        } else {
            // ERC20 token
            IERC20(bounty.rewardToken).safeTransfer(submission.submitter, bounty.reward);
        }

        emit BountyCompleted(_bountyId, submission.submitter, bounty.reward);
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
        uint256 submissionCount
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
            bounty.submissionCount
        );
    }

    // Get submission details
    function getSubmission(uint256 _bountyId, uint256 _submissionId) external view returns (
        address submitter,
        string memory ipfsProofHash,
        uint256 timestamp,
        bool approved,
        uint256 approvalCount
    ) {
        require(_submissionId < bounties[_bountyId].submissionCount, "Invalid submission ID");
        Submission storage submission = bounties[_bountyId].submissions[_submissionId];
        return (
            submission.submitter,
            submission.ipfsProofHash,
            submission.timestamp,
            submission.approved,
            submission.approvalCount
        );
    }

    // Get bounties created by a user
    function getUserBounties(address _user) external view returns (uint256[] memory) {
        return userBounties[_user];
    }

    // Get bounties where user has submitted proofs
    function getUserSubmissions(address _user) external view returns (uint256[] memory) {
        return userSubmissions[_user];
    }

    // Get submission count for a bounty
    function getSubmissionCount(uint256 _bountyId) external view returns (uint256) {
        return bounties[_bountyId].submissionCount;
    }

    // Check if a user has voted on a specific submission
    function hasVotedOnSubmission(uint256 _bountyId, uint256 _submissionId, address _user) external view returns (bool) {
        return bounties[_bountyId].submissions[_submissionId].hasVoted[_user];
    }

    receive() external payable {}
    fallback() external payable {}
}