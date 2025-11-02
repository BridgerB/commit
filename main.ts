#!/usr/bin/env -S deno run --allow-run

/**
 * A CLI tool to help with committing code by running formatting, linting, and build checks.
 */

interface CommandConfig {
  cmd: string;
  args: string[];
}

enum CommitCheck {
  GIT_STATUS = "git_status",
  FMT = "fmt",
  FMT_CHECK = "fmt_check",
  LINT = "lint",
  CHECK = "check",
  TEST = "test",
  BUILD = "build",
}

const COMMIT_CHECKS: Record<CommitCheck, CommandConfig> = {
  [CommitCheck.GIT_STATUS]: { cmd: "git", args: ["diff", "--quiet"] },
  [CommitCheck.FMT]: { cmd: "nix", args: ["run", ".#fmt"] },
  [CommitCheck.FMT_CHECK]: { cmd: "nix", args: ["run", ".#fmt-check"] },
  [CommitCheck.LINT]: { cmd: "nix", args: ["run", ".#lint"] },
  [CommitCheck.CHECK]: { cmd: "nix", args: ["run", ".#check"] },
  [CommitCheck.TEST]: { cmd: "nix", args: ["run", ".#test"] },
  [CommitCheck.BUILD]: { cmd: "nix", args: ["run", ".#build"] },
};

async function checkGitStatus(): Promise<boolean> {
  const command = new Deno.Command(COMMIT_CHECKS[CommitCheck.GIT_STATUS].cmd, {
    args: COMMIT_CHECKS[CommitCheck.GIT_STATUS].args,
    stderr: "piped",
    stdout: "piped",
  });
  const { success } = await command.output();
  return success;
}

async function runCommand(config: CommandConfig): Promise<boolean> {
  console.log(`Running: ${config.cmd} ${config.args.join(" ")}`);

  const command = new Deno.Command(config.cmd, {
    args: config.args,
    stdout: "inherit",
    stderr: "inherit",
  });
  const { success } = await command.output();

  if (success) {
    console.log("✓ Command succeeded\n");
  } else {
    console.log("✗ Command failed\n");
  }

  return success;
}

async function executeCommitChecks(): Promise<void> {
  console.log("Starting commit validation process...\n");

  // Step 1: Fail if there are unstaged changes
  console.log("Checking for unstaged changes...");
  const noUnstagedChanges = await checkGitStatus();
  if (!noUnstagedChanges) {
    console.error(
      "✗ There are unstaged changes. Please commit or stash them before continuing.",
    );
    Deno.exit(1);
  }
  console.log("✓ No unstaged changes\n");

  // Step 2: Run nix run .#fmt
  console.log("Running formatter...");
  if (!await runCommand(COMMIT_CHECKS[CommitCheck.FMT])) {
    console.error("✗ Failed to run formatter");
    Deno.exit(1);
  }

  // Step 3: Fail if there are unstaged changes after formatting
  console.log("Checking for unstaged changes after formatting...");
  const noUnstagedChangesAfterFmt = await checkGitStatus();
  if (!noUnstagedChangesAfterFmt) {
    console.error(
      "✗ There are unstaged changes after formatting. Please review and commit them.",
    );
    Deno.exit(1);
  }
  console.log("✓ No unstaged changes after formatting\n");

  // Step 4: Run nix run .#fmt-check
  console.log("Running format check...");
  if (!await runCommand(COMMIT_CHECKS[CommitCheck.FMT_CHECK])) {
    console.error("✗ Format check failed");
    Deno.exit(1);
  }

  // Step 5: Run nix run .#lint
  console.log("Running linter...");
  if (!await runCommand(COMMIT_CHECKS[CommitCheck.LINT])) {
    console.error("✗ Lint check failed");
    Deno.exit(1);
  }

  // Step 6: Run nix run .#check
  console.log("Running type check...");
  if (!await runCommand(COMMIT_CHECKS[CommitCheck.CHECK])) {
    console.error("✗ Type check failed");
    Deno.exit(1);
  }

  // Step 7: Run nix run .#test
  console.log("Running tests...");
  if (!await runCommand(COMMIT_CHECKS[CommitCheck.TEST])) {
    console.error("✗ Tests failed");
    Deno.exit(1);
  }

  // Step 8: Run nix run .#build
  console.log("Running build...");
  if (!await runCommand(COMMIT_CHECKS[CommitCheck.BUILD])) {
    console.error("✗ Build failed");
    Deno.exit(1);
  }

  console.log("✓ All checks passed! Ready to commit.");
}

if (import.meta.main) {
  executeCommitChecks().catch((error) => {
    console.error("An error occurred:", error);
    Deno.exit(1);
  });
}
