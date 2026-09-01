import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "dentist" | "staff";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "admin" | "dentist" | "staff";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "admin" | "dentist" | "staff";
  }
}
