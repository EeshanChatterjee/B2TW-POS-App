# GitHub Setup Guide

Your POS project is now a Git repository. Follow these steps to push it to GitHub.

## Step 1: Create Repository on GitHub

1. Go to [GitHub.com](https://github.com)
2. Log in to your account
3. Click the **+** icon in the top right → **New repository**
4. Fill in the details:
   - **Repository name:** `B2TW-POS-App` (or similar)
   - **Description:** "Point of Sale system for Bao to the Wings QSR food truck"
   - **Visibility:** Private (recommended) or Public
   - **Do NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **Create repository**

## Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these (replace `USERNAME` with your GitHub username):

```bash
cd /Users/eeshanchatterjee/Documents/Claude/Projects/B2TW\ POS\ App

# Add GitHub as remote
git remote add origin https://github.com/USERNAME/B2TW-POS-App.git

# Rename branch to main (optional but recommended)
git branch -m master main

# Push to GitHub
git push -u origin main
```

## Step 3: Verify on GitHub

1. Refresh your GitHub repository page
2. You should see all your files and folders
3. Check the commit history (showing your initial commit)

## Using SSH Instead (Optional - More Secure)

If you prefer SSH authentication:

```bash
# Add SSH remote instead
git remote add origin git@github.com:USERNAME/B2TW-POS-App.git

# Push
git push -u origin main
```

First, make sure you have SSH keys set up:
- [GitHub SSH Key Setup Guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)

## Daily Workflow

### Committing Changes

```bash
# Check what changed
git status

# Stage specific files
git add frontend/src/pages/TellerScreen.tsx backend/src/api/products.js

# Or stage all changes
git add -A

# Commit with message
git commit -m "Add product grid component and API endpoints"

# Push to GitHub
git push
```

### Creating Branches

For Phase 2 feature development, create feature branches:

```bash
# Create new branch
git checkout -b feature/teller-screen

# Make changes and commit
git add -A
git commit -m "Build teller screen UI with product grid"

# Push branch to GitHub
git push -u origin feature/teller-screen

# When ready to merge, create Pull Request on GitHub
# Then merge to main
```

### Branch Naming Convention

Use descriptive branch names:
- `feature/teller-screen`
- `feature/admin-panel`
- `feature/printer-integration`
- `bugfix/cart-total-calculation`
- `docs/api-reference-update`

## Recommended GitHub Settings

1. Go to your repository → **Settings**
2. Under "Collaborators and teams":
   - Add any team members who need access
3. Under "Branches":
   - Click "Add rule" for the `main` branch
   - Require pull request reviews before merging
   - Require status checks to pass
4. Under "Actions" (if using GitHub Actions):
   - Enable automated tests/builds

## Continuous Integration (Optional)

Consider adding GitHub Actions for:
- Running tests on every push
- Linting code
- Building frontend

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm install && npm test
      - run: cd frontend && npm install && npm run build
```

## Managing .gitignore

Your `.gitignore` already excludes:
- `node_modules/`
- `.env` (sensitive data)
- Database files (`.db`, `.sqlite`)
- IDE settings (`.vscode/`, `.idea/`)
- OS files (`Thumbs.db`, `.DS_Store`)

**Important:** Never commit:
- `.env` files with secrets
- `node_modules/` (restored with `npm install`)
- Database files (auto-generated)
- IDE settings (personal to each developer)

## Viewing Your Repository

Your GitHub repository will be at:
```
https://github.com/USERNAME/B2TW-POS-App
```

Share this URL with your team!

## Useful Git Commands

```bash
# View commit history
git log --oneline

# See changes in current branch
git diff main

# Undo last commit (keeping changes)
git reset --soft HEAD~1

# Sync with remote
git pull origin main

# See all branches
git branch -a

# Delete a local branch
git branch -d feature/old-feature

# Check remote URL
git remote -v
```

## Troubleshooting

### "fatal: 'origin' does not appear to be a 'git' repository"

You haven't added the remote yet. Do:
```bash
git remote add origin https://github.com/USERNAME/B2TW-POS-App.git
```

### "Permission denied (publickey)"

You're using SSH but don't have keys set up. Either:
- Set up SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
- Or use HTTPS instead: `git remote set-url origin https://...`

### "fatal: The current branch main has no upstream branch"

When pushing a new branch:
```bash
git push -u origin main
```

The `-u` flag sets the upstream branch.

## Next Steps

1. ✅ Git repository initialized locally
2. ⏭️ Create GitHub repository (from Step 1 above)
3. ⏭️ Connect and push (from Step 2 above)
4. ⏭️ Start Phase 2 development with feature branches

---

**Once pushed to GitHub, your team can:**
- Clone the repository: `git clone https://github.com/USERNAME/B2TW-POS-App.git`
- Create feature branches for development
- Submit pull requests for code review
- Merge changes to main

**Happy coding!** 🚀
