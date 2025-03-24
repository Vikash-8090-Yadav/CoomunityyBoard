// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CommunityBountyBoard is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Constants
    uint256 public constant BLOCKS_PER_DAY = 7200; // Assuming 12 seconds per block
    uint256 public constant TOTAL_VOTES = 3;
    
    // Structs
    struct Submission {
        address submitter;
        string ipfsProofHash;
        uint256 timestamp;
        bool approved;
        uint256 approvalCount;
        uint256 rejectCount;
        bool isWinner;
        uint256 rewardShare;
        mapping(address => bool) hasVoted;
    }

    struct Bounty {
        uint256 id;
        address creator;
        string title;
        string description;
        string proofRequirements;
        uint256 reward;
        address rewardToken;
        uint256 deadline;
        bool completed;
        uint256 winnerCount;
        uint256 submissionCount;
        mapping(uint256 => Submission) submissions;
    }

    // State variables
    uint256 public bountyCount;
    mapping(uint256 => Bounty) public bounties;
    mapping(address => uint256) public userReputation;
    mapping(address => uint256[]) private userBounties;
    mapping(address => uint256[]) private userSubmissions;
    mapping(uint256 => mapping(uint256 => string)) public submissionTxHashes;
    mapping(uint256 => mapping(uint256 => string)) public payoutTxHashes;
    mapping(uint256 => mapping(address => bool)) public hasSubmitted; // Gas optimization for submission checks

    // Events
    event BountyCreated(uint256 indexed bountyId, address indexed creator, string title, uint256 reward);
    event ProofSubmitted(uint256 indexed bountyId, address indexed submitter, string ipfsProofHash, string txHash);
    event BountyVoted(uint256 indexed bountyId, uint256 indexed submissionId, address indexed voter, bool approve);
    event BountyCompleted(uint256 indexed bountyId, uint256 winnerCount);
    event BountyCanceled(uint256 indexed bountyId, address indexed creator);
    event PayoutSent(uint256 indexed bountyId, uint256 indexed submissionId, address indexed winner, uint256 amount, string txHash);
    event ReputationUpdated(address indexed user, uint256 newReputation);
    event SubmissionRejected(uint256 indexed bountyId, uint256 indexed submissionId, address indexed submitter);

    constructor() Ownable() { }

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
        require(_reward > 0, "Reward must be greater than 0");

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
        newBounty.winnerCount = 0;

        userBounties[msg.sender].push(bountyId);

        if (_rewardToken == address(0)) {
            require(msg.value == _reward, "Must send exact reward amount");
        } else {
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
        require(bytes(_ipfsProofHash).length > 0 && bytes(_ipfsProofHash).length <= 100, "Invalid proof hash length");
        require(!hasSubmitted[_bountyId][msg.sender], "Already submitted a proof");

        uint256 submissionId = bounty.submissionCount++;
        Submission storage submission = bounty.submissions[submissionId];
        
        submission.submitter = msg.sender;
        submission.ipfsProofHash = _ipfsProofHash;
        submission.timestamp = block.timestamp;
        submission.approvalCount = 0;
        submission.rejectCount = 0;
        submission.isWinner = false;
        submission.rewardShare = 0;

        hasSubmitted[_bountyId][msg.sender] = true;
        userSubmissions[msg.sender].push(_bountyId);
        
        emit ProofSubmitted(_bountyId, msg.sender, _ipfsProofHash, "");
    }

    // Vote on a submission
    function voteOnSubmission(uint256 _bountyId, uint256 _submissionId, bool _approve) external {
        Bounty storage bounty = bounties[_bountyId];
        require(_submissionId < bounty.submissionCount, "Invalid submission ID");
        Submission storage submission = bounty.submissions[_submissionId];

        require(!bounty.completed, "Bounty already completed");
        require(!submission.hasVoted[msg.sender], "Already voted");
        require(msg.sender != submission.submitter, "Cannot vote on own submission");
        require(submission.approvalCount + submission.rejectCount < TOTAL_VOTES, "Maximum votes reached");

        submission.hasVoted[msg.sender] = true;
        
        if (_approve) {
            submission.approvalCount++;
            emit BountyVoted(_bountyId, _submissionId, msg.sender, true);
        } else {
            submission.rejectCount++;
            emit BountyVoted(_bountyId, _submissionId, msg.sender, false);
            emit SubmissionRejected(_bountyId, _submissionId, submission.submitter);
        }

        if (submission.approvalCount + submission.rejectCount == TOTAL_VOTES) {
            determineWinner(_bountyId, _submissionId);
        }
    }

    // Determine if a submission is a winner
    function determineWinner(uint256 _bountyId, uint256 _submissionId) internal {
        Bounty storage bounty = bounties[_bountyId];
        Submission storage submission = bounty.submissions[_submissionId];

        if (submission.approvalCount > submission.rejectCount) {
            submission.isWinner = true;
            bounty.winnerCount++;
            submission.approved = true;
        } else {
            submission.approved = false;
        }
    }

    // Complete bounty and distribute rewards
    function completeBounty(uint256 _bountyId) external nonReentrant {
        Bounty storage bounty = bounties[_bountyId];
        require(!bounty.completed, "Bounty already completed");
        require(block.timestamp > bounty.deadline, "Bounty deadline not reached");

        uint256 totalWinners = 0;
        for (uint256 i = 0; i < bounty.submissionCount; i++) {
            if (bounty.submissions[i].isWinner) {
                totalWinners++;
            }
        }

        require(totalWinners > 0, "No winners found");

        // Calculate reward share for each winner
        uint256 rewardShare = bounty.reward / totalWinners;
        uint256 remainder = bounty.reward % totalWinners;

        // Distribute rewards
        for (uint256 i = 0; i < bounty.submissionCount; i++) {
            Submission storage submission = bounty.submissions[i];
            if (submission.isWinner) {
                uint256 finalShare = rewardShare;
                if (remainder > 0) {
                    finalShare++;
                    remainder--;
                }

                bytes32 payoutTxHash = keccak256(abi.encodePacked(
                    _bountyId,
                    i,
                    submission.submitter,
                    finalShare,
                    block.timestamp
                ));
                string memory payoutTxHashStr = string(abi.encodePacked("0x", toAsciiString(payoutTxHash)));
                payoutTxHashes[_bountyId][i] = payoutTxHashStr;

                // Update reputation before transfer
                userReputation[submission.submitter] += 10;
                emit ReputationUpdated(submission.submitter, userReputation[submission.submitter]);

                if (bounty.rewardToken == address(0)) {
                    (bool success, ) = payable(submission.submitter).call{value: finalShare}("");
                    require(success, "Transfer failed");
                } else {
                    IERC20(bounty.rewardToken).safeTransfer(submission.submitter, finalShare);
                }

                emit PayoutSent(_bountyId, i, submission.submitter, finalShare, payoutTxHashStr);
            }
        }

        // Update creator's reputation
        userReputation[bounty.creator] += 5;
        emit ReputationUpdated(bounty.creator, userReputation[bounty.creator]);

        bounty.completed = true;
        emit BountyCompleted(_bountyId, totalWinners);
    }

    // Helper function to get transaction hash
    function getTransactionHash(uint256 _bountyId, uint256 _submissionId) internal view returns (string memory) {
        return submissionTxHashes[_bountyId][_submissionId];
    }

    // Helper function to convert bytes32 to string
    function toAsciiString(bytes32 _bytes) internal pure returns (string memory) {
        bytes memory s = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            bytes1 b = bytes1(bytes32(uint256(_bytes) * 2 ** (8 * i)));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i] = char(hi);
            s[2*i+1] = char(lo);            
        }
        return string(s);
    }

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    // Get submission transaction hash
    function getSubmissionTxHash(uint256 _bountyId, uint256 _submissionId) external view returns (string memory) {
        return submissionTxHashes[_bountyId][_submissionId];
    }

    // Get payout transaction hash for a submission
    function getPayoutTxHash(uint256 _bountyId, uint256 _submissionId) external view returns (string memory) {
        return payoutTxHashes[_bountyId][_submissionId];
    }

    // Get submission details with payout transaction hash
    function getSubmission(uint256 _bountyId, uint256 _submissionId) external view returns (
        address submitter,
        string memory ipfsProofHash,
        uint256 timestamp,
        bool approved,
        uint256 approvalCount,
        uint256 rejectCount,
        bool isWinner,
        uint256 rewardShare,
        string memory txHash,
        string memory payoutTxHash
    ) {
        require(_submissionId < bounties[_bountyId].submissionCount, "Invalid submission ID");
        
        // Get submission data in chunks to avoid stack too deep
        (submitter, ipfsProofHash, timestamp) = getSubmissionBasicInfo(_bountyId, _submissionId);
        (approved, approvalCount, rejectCount) = getSubmissionVoteInfo(_bountyId, _submissionId);
        (isWinner, rewardShare) = getSubmissionStatus(_bountyId, _submissionId);
        txHash = submissionTxHashes[_bountyId][_submissionId];
        payoutTxHash = payoutTxHashes[_bountyId][_submissionId];
    }

    // Helper function to get basic submission info
    function getSubmissionBasicInfo(uint256 _bountyId, uint256 _submissionId) internal view returns (
        address submitter,
        string memory ipfsProofHash,
        uint256 timestamp
    ) {
        Submission storage submission = bounties[_bountyId].submissions[_submissionId];
        return (
            submission.submitter,
            submission.ipfsProofHash,
            submission.timestamp
        );
    }

    // Helper function to get voting info
    function getSubmissionVoteInfo(uint256 _bountyId, uint256 _submissionId) internal view returns (
        bool approved,
        uint256 approvalCount,
        uint256 rejectCount
    ) {
        Submission storage submission = bounties[_bountyId].submissions[_submissionId];
        return (
            submission.approved,
            submission.approvalCount,
            submission.rejectCount
        );
    }

    // Helper function to get submission status
    function getSubmissionStatus(uint256 _bountyId, uint256 _submissionId) internal view returns (
        bool isWinner,
        uint256 rewardShare
    ) {
        Submission storage submission = bounties[_bountyId].submissions[_submissionId];
        return (
            submission.isWinner,
            submission.rewardShare
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