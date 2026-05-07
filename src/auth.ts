// PropXchain MCP Server - Bot Authentication
//
// Identity model: Ed25519 keypair stored locally on the user's machine,
// never crossing any chat or config-file boundary.
//
// Resolution order on startup:
//   1. BOT_PRIVATE_KEY env var (override, primarily for ops/CI). 32-byte seed,
//      base64-encoded.
//   2. ~/.config/propxchain-mcp/identity.key  (macOS/Linux)
//      %APPDATA%/propxchain-mcp/identity.key  (Windows)
//      File contents are the same base64-encoded 32-byte seed.
//   3. If neither exists, generate a fresh seed, write it to the file path
//      above with 0600 perms (POSIX), and report "first-run" via source flag.
//
// Rationale: the bot's principal is a public identifier; the seed is not.
// Generating the seed locally means the user never has to copy it across
// trust boundaries (browser, AI chat, config file). Authorisation to a
// transaction happens via the public invite code instead.

import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import type { Identity } from '@icp-sdk/core/agent';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

export interface BotConfig {
  privateKey: string;        // base64-encoded 32-byte seed
  network: string;
  source: 'env' | 'file' | 'generated';
  filePath: string | null;   // populated for source !== 'env'
}

/** Resolve the directory where the local identity file lives. */
function identityDir(): string {
  if (platform() === 'win32') {
    const appData = process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming');
    return join(appData, 'propxchain-mcp');
  }
  // macOS, Linux, BSD. Honour XDG_CONFIG_HOME when set.
  const xdg = process.env.XDG_CONFIG_HOME;
  return join(xdg ?? join(homedir(), '.config'), 'propxchain-mcp');
}

function identityFilePath(): string {
  return join(identityDir(), 'identity.key');
}

/**
 * Load the bot config from env, then file, then first-run generation, in that
 * order. The caller can read the `source` field to decide what to log.
 */
export function loadBotConfig(): BotConfig {
  const network = process.env.IC_NETWORK || 'ic';

  // 1. Env var override.
  const envKey = process.env.BOT_PRIVATE_KEY;
  if (envKey && envKey.length > 0) {
    return { privateKey: envKey, network, source: 'env', filePath: null };
  }

  // 2. Local identity file.
  const filePath = identityFilePath();
  if (existsSync(filePath)) {
    const fileContents = readFileSync(filePath, 'utf8').trim();
    if (fileContents.length === 0) {
      throw new Error(
        `Identity file at ${filePath} is empty. Delete it to regenerate, or set BOT_PRIVATE_KEY.`,
      );
    }
    return { privateKey: fileContents, network, source: 'file', filePath };
  }

  // 3. First run. Generate, persist with 0600, return.
  const dir = identityDir();
  mkdirSync(dir, { recursive: true });
  const seed = randomBytes(32);
  const seedB64 = seed.toString('base64');
  writeFileSync(filePath, seedB64 + '\n', { encoding: 'utf8' });
  // chmod 600 is a no-op on Windows. Best effort on POSIX.
  try {
    chmodSync(filePath, 0o600);
  } catch {
    /* ignored */
  }
  return { privateKey: seedB64, network, source: 'generated', filePath };
}

/** Create an Ed25519 identity from the bot's private key seed. */
export function createBotIdentity(config: BotConfig): Identity {
  const seedBytes = Buffer.from(config.privateKey, 'base64');
  if (seedBytes.length !== 32) {
    throw new Error(
      `Invalid bot private key: expected 32-byte seed (base64), got ${seedBytes.length} bytes. Source: ${config.source}${config.filePath ? ` (${config.filePath})` : ''}.`,
    );
  }

  const seed = new Uint8Array(seedBytes);
  const identity = Ed25519KeyIdentity.generate(seed);
  return identity;
}
