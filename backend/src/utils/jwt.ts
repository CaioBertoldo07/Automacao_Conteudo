import jwt from "jsonwebtoken";
import { env } from "../config/env";

interface TokenPayload {
  sub: string;
  exp?: number;
}

export function createAccessToken(userId: string): string {
  const expiresIn = env.accessTokenExpireMinutes * 60;
  return jwt.sign({ sub: userId }, env.secretKey, { expiresIn });
}

export function decodeAccessToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, env.secretKey) as TokenPayload;
    return payload;
  } catch {
    return null;
  }
}
