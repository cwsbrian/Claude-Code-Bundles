import { describe, expect, it, vi } from "vitest";
import {
  downloadSnapshotToFile,
  listRemoteBundles,
} from "../packages/cli/src/remote.ts";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

describe("remote list / download client (SEC-01 / error paths)", () => {
  it("listRemoteBundles throws with status when API returns 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })),
    );
    try {
      await expect(
        listRemoteBundles({ apiUrl: "http://localhost:3000", token: "other-user-jwt" }),
      ).rejects.toMatchObject({ status: 403 });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("downloadSnapshotToFile throws when download returns 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Not found", { status: 404 })),
    );
    const tmp = await mkdtemp(path.join(os.tmpdir(), "dl-"));
    const out = path.join(tmp, "x.zip");
    try {
      await expect(
        downloadSnapshotToFile({
          apiUrl: "http://localhost:3000",
          token: "jwt",
          bundleId: "b1",
          snapshotId: "s1",
          outPath: out,
        }),
      ).rejects.toMatchObject({ status: 404 });
    } finally {
      vi.unstubAllGlobals();
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("downloadSnapshotToFile writes response body on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array([80, 75, 3, 4]), { status: 200 })),
    );
    const tmp = await mkdtemp(path.join(os.tmpdir(), "dl-ok-"));
    const out = path.join(tmp, "x.zip");
    try {
      await downloadSnapshotToFile({
        apiUrl: "http://localhost:3000",
        token: "jwt",
        bundleId: "b1",
        snapshotId: "s1",
        outPath: out,
      });
      const buf = await readFile(out);
      expect(buf[0]).toBe(80);
      expect(buf[1]).toBe(75);
    } finally {
      vi.unstubAllGlobals();
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
