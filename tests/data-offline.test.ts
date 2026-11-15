import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import vm from "node:vm";
const importer = pathToFileURL(
  path.resolve("scripts/fetch-nasa-data.mjs"),
).href;
test("RadLab normalization rejects missing doses and keeps scientific units and platform", async () => {
  const { normalizeRadlab } = await import(importer);
  const columns = [
    "timestamp",
    "instrument_id",
    "absorbed_dose_rate",
    "spacecraft",
  ];
  assert.throws(() =>
    normalizeRadlab(
      { columns, data: [["2022-04-01T23:00:00", "DosTel1", null, "ISS"]] },
      "2026-11-14",
    ),
  );
  assert.throws(() =>
    normalizeRadlab(
      { columns, data: [["2022-04-01T23:00:00", "DosTel1", NaN, "ISS"]] },
      "2026-11-14",
    ),
  );
  const [r] = normalizeRadlab(
    { columns, data: [["2022-04-01T23:00:00", "DosTel1", 9.815504, "ISS"]] },
    "2026-11-14",
  );
  assert.equal(r.unit, "μGy/h");
  assert.equal(r.platform, "ISS");
  assert.equal(r.absorbedDoseRate, 9.815504);
  assert.ok(!JSON.stringify(r).includes("api_key"));
});
test("DONKI normalization whitelists fields and omits unrelated credentials", async () => {
  const { normalizeDonki } = await import(importer);
  const [r] = normalizeDonki(
    [
      {
        flrID: "2024-05-10T06:27:00-FLR-001",
        beginTime: "2024-05-10T06:27Z",
        classType: "X3.9",
        api_key: "private-test-value",
        link: "https://ccmc.gsfc.nasa.gov/DONKI/events/30666/2/",
      },
    ],
    "FLR",
    "2026-11-14",
  );
  assert.equal(r.properties.classType, "X3.9");
  assert.ok(!JSON.stringify(r).includes("private-test-value"));
  assert.throws(() =>
    normalizeDonki({ error: "unavailable" }, "FLR", "2026-11-14"),
  );
});
test("built offline worker serves cached navigation, assets and JSON from a repository subpath without network", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "aurora-offline-"));
  try {
    await mkdir(path.join(dir, "dist/assets"), { recursive: true });
    await mkdir(path.join(dir, "dist/data"), { recursive: true });
    await writeFile(
      path.join(dir, "dist/index.html"),
      "<title>Base Aurora</title>",
    );
    await writeFile(path.join(dir, "dist/assets/app.js"), "game");
    await writeFile(
      path.join(dir, "dist/data/science.json"),
      '{"mode":"historical"}',
    );
    await promisify(execFile)(
      process.execPath,
      [path.resolve("scripts/build-offline.mjs")],
      { cwd: dir },
    );
    const worker = await readFile(path.join(dir, "dist/sw.js"), "utf8"),
      scope = "https://example.github.io/base-aurora/";
    const handlers: Record<string, (event: any) => void> = {},
      contents = new Map<string, string>();
    let networkCalls = 0;
    const caches = {
      async open() {
        return {
          async addAll(files: string[]) {
            for (const file of files) {
              const url = new URL(file, scope);
              contents.set(
                url.href,
                await readFile(path.join(dir, "dist", file), "utf8"),
              );
            }
          },
        };
      },
      async keys() {
        return [];
      },
      async match(request: string | { url: string }) {
        return contents.get(
          typeof request === "string" ? request : request.url,
        );
      },
      async delete() {
        return true;
      },
    };
    const self = {
      registration: { scope },
      location: { origin: "https://example.github.io" },
      clients: { async claim() {} },
      async skipWaiting() {},
      addEventListener(name: string, callback: (event: any) => void) {
        handlers[name] = callback;
      },
    };
    vm.runInNewContext(worker, {
      self,
      caches,
      URL,
      btoa: (s: string) => Buffer.from(s).toString("base64"),
      fetch() {
        networkCalls++;
        throw new Error("offline");
      },
    });
    let pending: Promise<unknown> = Promise.resolve();
    handlers.install({
      waitUntil(p: Promise<unknown>) {
        pending = p;
      },
    });
    await pending;
    for (const [url, mode, expected] of [
      [scope, "navigate", "Base Aurora"],
      [scope + "assets/app.js", "cors", "game"],
      [scope + "data/science.json", "cors", "historical"],
    ]) {
      handlers.fetch({
        request: { method: "GET", url, mode },
        respondWith(p: Promise<unknown>) {
          pending = p;
        },
      });
      assert.ok(String(await pending).includes(expected));
    }
    assert.equal(networkCalls, 0);
    assert.equal(contents.size, 3);
  } finally {
    assert.equal(path.dirname(dir), path.resolve(tmpdir()));
    assert.ok(path.basename(dir).startsWith("aurora-offline-"));
    await rm(dir, { recursive: true, force: true });
  }
});
