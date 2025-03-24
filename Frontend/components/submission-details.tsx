"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, User, ExternalLink } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import type { Submission, Bounty } from "@/types/bounty"
import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useAccount } from '@/context/account-context';
import { contract } from '@/lib/contract';

interface SubmissionDetailsProps {
  bountyId: number
  submission: Submission
  bounty: Bounty
  onVote: (submissionId: number, approve: boolean) => Promise<void>
}

export default function SubmissionDetails({ bountyId, submission, bounty, onVote }: SubmissionDetailsProps) {
  const { address } = useAccount();
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [isLoadingVoteStatus, setIsLoadingVoteStatus] = useState(true);
  const [payoutTxHash, setPayoutTxHash] = useState<string | null>(null);

  useEffect(() => {
    const checkVoteStatus = async () => {
      if (!address || !bounty || !submission) return;
      
      try {
        const voted = await contract.hasVotedOnSubmission(bounty.id, submission.id, address);
        setHasVoted(voted);
      } catch (error) {
        console.error('Error checking vote status:', error);
      } finally {
        setIsLoadingVoteStatus(false);
      }
    };

    const getPayoutTxHash = async () => {
      if (!bounty || !submission || !submission.isWinner) return;
      
      try {
        const hash = await contract.getPayoutTxHash(bounty.id, submission.id);
        if (hash && hash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
          setPayoutTxHash(hash);
        }
      } catch (error) {
        console.error('Error getting payout transaction hash:', error);
      }
    };

    checkVoteStatus();
    getPayoutTxHash();
  }, [address, bounty, submission]);

  const handleVote = async (approve: boolean) => {
    if (!bounty || !submission) return;
    
    setIsVoting(true);
    setVoteError(null);
    
    try {
      await onVote(submission.id, approve);
      setHasVoted(true);
    } catch (error) {
      console.error('Error voting:', error);
      setVoteError('Failed to vote. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submission Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Submitted by</p>
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2 text-primary/70" />
              <p className="font-medium">{`${submission.submitter.substring(0, 6)}...${submission.submitter.substring(submission.submitter.length - 4)}`}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Proof</p>
            <a
              href={`https://gateway.pinata.cloud/ipfs/${submission.proofCID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center group"
            >
              <ExternalLink className="h-4 w-4 mr-2 group-hover:text-primary/80 transition-colors" />
              <span className="font-medium">View Proof on IPFS</span>
            </a>
          </div>
        </div>

        <Separator />

        {submission.comments && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Comments</p>
            <div className="bg-muted/20 p-3 rounded-md border border-border/50">
              <p className="whitespace-pre-line text-sm">{submission.comments}</p>
            </div>
          </div>
        )}

        {submission.isWinner && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="success" className="bg-green-100 text-green-800">
                Winner
              </Badge>
              {payoutTxHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${payoutTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Payout Transaction
                </a>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Voting Status</h4>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-green-600">Approvals:</span>
                <span>{submission.approvalCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-600">Rejections:</span>
                <span>{submission.rejectCount}</span>
              </div>
            </div>
          </div>

          {!isLoadingVoteStatus && !hasVoted && address && address !== submission.submitter && (
            <div className="flex gap-4">
              <Button
                onClick={() => handleVote(true)}
                disabled={isVoting}
                className="bg-green-600 hover:bg-green-700"
              >
                Approve
              </Button>
              <Button
                onClick={() => handleVote(false)}
                disabled={isVoting}
                className="bg-red-600 hover:bg-red-700"
              >
                Reject
              </Button>
            </div>
          )}

          {voteError && (
            <p className="text-red-600 text-sm">{voteError}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

