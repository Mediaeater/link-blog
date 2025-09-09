# Push Rulesets for Link Blog Repository

## Overview
These rulesets protect the repository from accidental damage and enforce code quality standards.

## Implemented Rules

### 1. Branch Protection (Main Branch)
- ✅ **Require pull request before merging**
  - At least 1 approval required
  - Dismiss stale reviews on new commits
  - PR conversation must be resolved
  
- ✅ **Status checks must pass**
  - Build workflow must succeed
  - Tests must pass (when implemented)
  
- ✅ **Enforce restrictions**
  - No force pushes allowed
  - No branch deletion allowed
  - Maintain linear history
  
### 2. Automated Workflows
- **CI Pipeline**: Runs on every PR
  - Build verification (Node 18.x, 20.x)
  - Security audit
  - Secret scanning
  - Bookmark parser tests

### 3. Code Ownership
- CODEOWNERS file ensures automatic review requests
- Core components require owner review

### 4. Commit Rules
- **Recommended commit format**:
  ```
  type: description
  
  - Detail 1
  - Detail 2
  
  Co-Authored-By: Name <email>
  ```

### 5. Security Rules
- No secrets in commits (enforced by TruffleHog)
- High-severity npm vulnerabilities blocked
- Private URL filtering in bookmark imports

## How to Apply Rules

### Option 1: Automated Setup (Recommended)
```bash
# Apply all protection rules
bash .github/setup-protection.sh
```

### Option 2: Manual GitHub UI Setup
1. Go to Settings → Branches
2. Add rule for `main` branch
3. Enable:
   - Require PR before merging
   - Require status checks
   - Require conversation resolution
   - Include administrators
   - Restrict force pushes

### Option 3: GitHub CLI Commands
```bash
# Basic protection
gh api -X PUT /repos/Mediaeater/link-blog/branches/main/protection \
  --field required_status_checks='{"strict":true,"contexts":["build"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1}'
```

## Exceptions and Bypass

### Emergency Bypass (Admins Only)
```bash
# Temporarily disable protection (USE WITH CAUTION)
gh api -X DELETE /repos/Mediaeater/link-blog/branches/main/protection

# Re-enable after emergency
bash .github/setup-protection.sh
```

### Workflow Bypass
- Add `[skip ci]` to commit message to skip CI checks
- Use sparingly for documentation-only changes

## Best Practices

1. **Always create feature branches**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Keep PRs focused**
   - One feature per PR
   - Separate refactoring from features
   - Include tests when adding features

3. **Write descriptive PR descriptions**
   - Explain what changed
   - Include testing steps
   - Reference related issues

4. **Review your own PR first**
   - Check for secrets
   - Verify no debug code
   - Ensure proper error handling

## Monitoring

### Check Protection Status
```bash
gh api /repos/Mediaeater/link-blog/branches/main/protection
```

### View Recent PRs
```bash
gh pr list --limit 10
```

### Check Workflow Runs
```bash
gh run list --workflow=ci.yml
```

## Troubleshooting

### PR Can't Be Merged
- Ensure all checks pass
- Resolve all conversations
- Get required approvals
- Rebase if behind main

### Build Failures
- Check Node version compatibility
- Verify dependencies installed
- Review error logs in Actions tab

### Protection Not Working
- Verify you have admin access
- Check if rules are enabled
- Review webhook settings

## References
- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [GitHub Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)