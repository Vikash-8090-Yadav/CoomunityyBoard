#!/bin/bash

# Add and commit modified files
git add Frontend/components/create-bounty-form.tsx
git commit -m "fix: Fixed date and time formatting in bounty creation"

git add Frontend/components/quality-check-panel.tsx
git commit -m "feat: Made quality check accessible to all users"

git add Frontend/components/verification-panel.tsx
git commit -m "feat: Added transaction link display in reward success toast"

git add Frontend/package-lock.json
git commit -m "chore: Updated package dependencies"

git add Frontend/package.json
git commit -m "chore: Updated package dependencies"

git add Frontend/types/bounty.ts
git commit -m "feat: Updated bounty and submission types"

# Add and commit new files
git add Frontend/components/bounty-ai-suggestions.tsx
git commit -m "feat: Added AI-powered bounty suggestions component"

git add Frontend/components/reward-distribution-panel.tsx
git commit -m "feat: Added smart reward distribution panel"

git add Frontend/pages/api/analyze-bounty.ts
git commit -m "feat: Added bounty analysis API endpoint"

git add Frontend/pages/api/analyze-rewards.ts
git commit -m "feat: Added reward analysis API endpoint"

git add git-commands.sh
git commit -m "chore: Added git commands script"

# Push all changes
git push 