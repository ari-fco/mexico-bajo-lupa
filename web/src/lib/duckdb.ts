"use client";

/**
 * Thin wrapper around @duckdb/duckdb-wasm.
 *
 * Today, the app reads JSON exported by the ETL via lib/queries.ts.
 * When the JSON bridge stops fitting the dataset size, swap the
 * lib/queries.ts calls to use `runSql` from this module — same SQL
 * works on both engines, no change to component code required.
 */

import * as duckdb from "@duckdb/duckdb-wasm";

let instance: Promise<duckdb.AsyncDuckDB> | null = null;

export function getDuckDB(): Promise<duckdb.AsyncDuckDB> {
  if (instance) return instance;
  instance = (async () => {
    const bundles = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(bundles);
    const workerUrl = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker!}");`], {
        type: "text/javascript",
      }),
    );
    const worker = new Worker(workerUrl);
    const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(workerUrl);
    return db;
  })();
  return instance;
}

export async function registerParquet(name: string, url: string) {
  const db = await getDuckDB();
  await db.registerFileURL(
    `${name}.parquet`,
    url,
    // Range requests over HTTP — DuckDB-WASM streams what it needs.
    // (eslint-disable for the enum import we'd need otherwise.)
    /* DuckDBDataProtocol.HTTP */ 4 as unknown as duckdb.DuckDBDataProtocol,
    false,
  );
}

export async function runSql<T = Record<string, unknown>>(
  sql: string,
): Promise<T[]> {
  const db = await getDuckDB();
  const conn = await db.connect();
  try {
    const res = await conn.query(sql);
    return res.toArray().map((r) => r.toJSON() as T);
  } finally {
    await conn.close();
  }
}
