import * as jose from "jose";
import { env } from "./env";
import { getDb } from "../queries/connection";
import { staffUsers } from "@db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const SECRET = new TextEncoder().encode(env.jwtSecret);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signStaffToken(payload: {
  staffId: number;
  username: string;
  role: string;
}): Promise<string> {
  return new jose.SignJWT({
    staffId: payload.staffId,
    username: payload.username,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyStaffToken(
  token: string
): Promise<{ staffId: number; username: string; role: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, SECRET, { clockTolerance: 60 });
    return {
      staffId: payload.staffId as number,
      username: payload.username as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export async function authenticateStaffRequest(headers: Headers) {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      if (key && value) acc[key] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  const token = cookies["nysc_staff_token"];
  if (!token) return null;

  const claim = await verifyStaffToken(token);
  if (!claim) return null;

  const db = getDb();
  const user = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.id, claim.staffId))
    .then((rows) => rows[0]);

  if (!user || !user.isActive) return null;

  return user;
}
