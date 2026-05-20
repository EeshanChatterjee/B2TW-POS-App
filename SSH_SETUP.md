# Passwordless SSH Setup for GitHub

Set up SSH keys for secure, password-free Git operations with GitHub.

## Step 1: Check for Existing SSH Keys

Open Terminal and run:

```bash
ls -la ~/.ssh
```

If you see `id_rsa` and `id_rsa.pub`, you already have SSH keys. Skip to Step 3.

If nothing shows up, continue to Step 2.

## Step 2: Generate SSH Key (If Needed)

```bash
ssh-keygen -t ed25519 -C "eeshanchatterjee@gmail.com" -f ~/.ssh/id_ed25519
```

When prompted:
- **Enter passphrase:** Press Enter (no passphrase = truly passwordless)
- Or set a passphrase for extra security (you'll need it once per session)

This creates two files:
- `~/.ssh/id_ed25519` (private key - keep secret!)
- `~/.ssh/id_ed25519.pub` (public key - share with GitHub)

## Step 3: Add SSH Key to GitHub

### 3a. Copy Your Public Key

```bash
cat ~/.ssh/id_ed25519.pub
```

Copy the entire output (starts with `ssh-ed25519`).

### 3b. Add to GitHub

1. Go to **[GitHub Settings → SSH and GPG Keys](https://github.com/settings/keys)**
2. Click **New SSH key**
3. **Title:** `My Mac`
4. **Key type:** Authentication Key
5. **Key:** Paste your public key
6. Click **Add SSH key**

## Step 4: Test SSH Connection

```bash
ssh -T git@github.com
```

You should see:
```
Hi eeshanchatterjee! You've successfully authenticated, but GitHub does not provide shell access.
```

If you get `Permission denied`, the key wasn't added correctly. Go back to Step 3.

## Step 5: Switch to SSH Remote

Navigate to your project:

```bash
cd /Users/eeshanchatterjee/Documents/Claude/Projects/B2TW\ POS\ App
```

Change the remote from HTTPS to SSH:

```bash
git remote set-url origin git@github.com:eeshanchatterjee/B2TW-POS-App.git
```

Verify it changed:

```bash
git remote -v
```

Should show:
```
origin  git@github.com:eeshanchatterjee/B2TW-POS-App.git (fetch)
origin  git@github.com:eeshanchatterjee/B2TW-POS-App.git (push)
```

## Step 6: Push to GitHub

```bash
git push -u origin master
```

✅ You should now push without entering a password!

## ✨ SSH Agent Setup (Optional - For Multiple Devices)

To avoid re-entering your passphrase every session, add SSH key to macOS Keychain:

```bash
# Edit ~/.ssh/config (create if it doesn't exist)
nano ~/.ssh/config
```

Add this:

```
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    AddKeysToAgent yes
    UseKeychain yes
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

Now your SSH key is stored in macOS Keychain and you won't be prompted for passphrases.

## Daily Usage

Once SSH is set up:

```bash
# Push changes (no password needed!)
git push

# Pull changes (no password needed!)
git pull

# Commit and push
git add -A
git commit -m "Your message"
git push
```

## Security Notes

⚠️ **Never share your private key** (`~/.ssh/id_ed25519`)

✅ **Safe to share your public key** (`~/.ssh/id_ed25519.pub`)

✅ **SSH is more secure than HTTPS** - uses cryptographic keys instead of passwords

## Multiple GitHub Accounts

If you manage multiple GitHub accounts, you can set up multiple SSH keys:

```bash
# Generate second key
ssh-keygen -t ed25519 -C "your-other-email@gmail.com" -f ~/.ssh/id_ed25519_work

# Edit ~/.ssh/config
Host github.com-work
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_work

# Use in repo
git remote set-url origin git@github.com-work:username/repo.git
```

## Troubleshooting

### "Permission denied (publickey)"

```bash
# Debug SSH connection
ssh -vvv git@github.com

# Verify key is added to agent
ssh-add -l

# Add key to agent if missing
ssh-add ~/.ssh/id_ed25519
```

### "Could not read from remote repository"

- Check SSH key is added to GitHub (Settings → SSH Keys)
- Verify remote URL is correct: `git remote -v`
- Test connection: `ssh -T git@github.com`

### Want to Switch Back to HTTPS?

```bash
git remote set-url origin https://github.com/eeshanchatterjee/B2TW-POS-App.git
```

## ✅ Verification Checklist

- [ ] SSH key generated at `~/.ssh/id_ed25519`
- [ ] Public key added to GitHub
- [ ] SSH connection test passes: `ssh -T git@github.com`
- [ ] Remote URL is SSH format: `git@github.com:...`
- [ ] `git push` works without password prompt

---

**You're now set for secure, passwordless Git operations!** 🔒
