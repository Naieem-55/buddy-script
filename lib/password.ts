import { hash, verify } from "@node-rs/argon2";

// argon2id — memory-hard, resistant to GPU cracking.
const OPTS = {
  memoryCost: 19456, // 19 MiB (OWASP baseline)
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTS);
}

export async function verifyPassword(
  storedHash: string,
  plain: string
): Promise<boolean> {
  try {
    return await verify(storedHash, plain);
  } catch {
    return false;
  }
}
