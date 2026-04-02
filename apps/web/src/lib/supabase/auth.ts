import { createClient } from "@supabase/supabase-js";

function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Missing client Supabase key: set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Resolve Supabase user from `Authorization: Bearer <jwt>`. */
export async function requireUser(request: Request): Promise<{ id: string }> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing or invalid Authorization header");
  }
  const jwt = header.slice("Bearer ".length).trim();
  if (!jwt) {
    throw new HttpError(401, "Empty bearer token");
  }

  const supabase = getAnonClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(jwt);

  if (error || !user) {
    throw new HttpError(401, "Invalid or expired token");
  }

  return { id: user.id };
}
