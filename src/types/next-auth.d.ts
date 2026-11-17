import type { DefaultSession } from "next-auth";
import type { Role } from "./domain";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
    /** Epoch ms when the person signed in; sessions end 8 hours later. */
    signedInAt?: number;
  }
}
