#!/bin/bash

# Setup Branch Protection Rules for link-blog repository
# Run with: gh auth login && bash .github/setup-protection.sh

echo "🔒 Setting up branch protection rules for main branch..."

# Apply branch protection to main branch
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  /repos/Mediaeater/link-blog/branches/main/protection \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["build"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "require_last_push_approval": false,
    "bypass_pull_request_allowances": {
      "users": ["Mediaeater"],
      "teams": []
    }
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false,
  "required_linear_history": false,
  "allow_auto_merge": true,
  "delete_branch_on_merge": true
}
EOF

echo "✅ Branch protection rules applied!"

# Setup repository settings
echo "⚙️  Configuring repository settings..."

gh api \
  --method PATCH \
  -H "Accept: application/vnd.github+json" \
  /repos/Mediaeater/link-blog \
  --field allow_squash_merge=true \
  --field allow_merge_commit=true \
  --field allow_rebase_merge=false \
  --field delete_branch_on_merge=true \
  --field allow_auto_merge=true

echo "✅ Repository settings configured!"

# Create ruleset for additional protections
echo "📋 Creating push ruleset..."

gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  /repos/Mediaeater/link-blog/rulesets \
  --input - <<EOF
{
  "name": "Protected Branches Ruleset",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "deletion"
    },
    {
      "type": "non_fast_forward"
    },
    {
      "type": "creation"
    },
    {
      "type": "required_linear_history"
    },
    {
      "type": "required_signatures"
    }
  ]
}
EOF

echo "✅ Push ruleset created!"
echo "🎉 All protection rules have been applied successfully!"