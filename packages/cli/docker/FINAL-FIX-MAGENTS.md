# Final Fix for Magents Command

## The Problem

When you type `magents`, it opens Node.js REPL because there's a broken alias in your `.zshrc` that's incorrectly formatted.

## The Solution

### Step 1: Edit your ~/.zshrc file

Open `~/.zshrc` in your editor and look for lines like:
```bash
alias magents='node
/Users/santossafrao/Development/personal/magents/packages/cli/dist/bin/magents.js'
```

**DELETE these lines completely**.

### Step 2: Ensure npm global bin is in your PATH

Add this line to your `~/.zshrc` if it's not there:
```bash
export PATH="/Users/santossafrao/.npm-global/bin:$PATH"
```

### Step 3: Save and reload

```bash
source ~/.zshrc
```

### Step 4: Clear shell cache

```bash
hash -r
```

### Step 5: Test

```bash
magents --version
# Should output: 1.0.0

magents create test --dry-run
# Should show the agent creation preview
```

## Alternative: Direct Execution

If you still have issues, you can always use the full path:
```bash
/Users/santossafrao/.npm-global/bin/magents create auth-system
```

## Verification

The global magents is already installed at:
- `/Users/santossafrao/.npm-global/bin/magents`

You just need to:
1. Remove the broken alias from ~/.zshrc
2. Ensure the PATH includes npm global bin
3. Reload your shell

That's it! No need to reinstall anything.