import http from "node:http";
import type { AddressInfo } from "node:net";
import { createClient } from "@supabase/supabase-js";
import open from "open";
import { saveAuth } from "./auth-store.js";

export async function runLogin(opts: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiUrl: string;
}): Promise<void> {
  const { supabaseUrl, supabaseAnonKey, apiUrl } = opts;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, flowType: "pkce" },
  });

  // Start ephemeral HTTP server on OS-assigned port
  const server = http.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  const redirectTo = `http://127.0.0.1:${port}/callback`;

  // Initiate OAuth -- get URL to open in browser
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) {
    server.close();
    throw new Error(error?.message ?? "No OAuth URL returned");
  }

  process.stdout.write("Opening browser for login...\n");
  await open(data.url);

  // Wait for callback with 120-second timeout
  const session = await new Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: number;
  }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("Login timed out (2 minutes)"));
    }, 120_000);

    server.on("request", (req, res) => {
      void (async () => {
        const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
        if (url.pathname !== "/callback") {
          res.end();
          return;
        }
        const code = url.searchParams.get("code");
        if (!code) {
          res.writeHead(400);
          res.end("Missing code");
          return;
        }

        const { data: sessionData, error: exchangeErr } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeErr || !sessionData.session) {
          res.writeHead(500);
          res.end("Authentication failed");
          clearTimeout(timeout);
          reject(new Error(exchangeErr?.message ?? "No session returned"));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<html><body><h2>Login successful! You can close this tab.</h2></body></html>",
        );
        clearTimeout(timeout);
        resolve({
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          expires_at: sessionData.session.expires_at ?? 0,
        });
      })();
    });
  });

  await saveAuth({
    ...session,
    api_url: apiUrl,
    supabase_url: supabaseUrl,
    supabase_anon_key: supabaseAnonKey,
  });

  server.close();
  process.stdout.write("Logged in successfully.\n");
}
