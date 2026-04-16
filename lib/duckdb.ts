import * as duckdb from '@duckdb/duckdb-wasm';

const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;

/**
 * 初始化并获取 DuckDB 实例
 */
export async function getDuckDB() {
  if (db) return { db, conn };

  // 选择合适的 bundle
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker!}");`], {
      type: 'text/javascript'
    })
  );

  const worker = new Worker(worker_url);
  const logger = new duckdb.ConsoleLogger();
  
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(worker_url);

  conn = await db.connect();
  
  // 初始化表结构
  await conn.query(`
    CREATE TABLE IF NOT EXISTS room_cache (
      id VARCHAR PRIMARY KEY,
      password_hash VARCHAR,
      last_content TEXT,
      last_accessed TIMESTAMP
    )
  `);

  return { db, conn };
}

/**
 * 缓存房间信息到本地 SQL
 */
export async function cacheRoom(roomId: string, hash: string, content: string = "") {
  try {
    const { conn } = await getDuckDB();
    await conn.query(`
      INSERT OR REPLACE INTO room_cache (id, password_hash, last_content, last_accessed)
      VALUES ('${roomId}', '${hash}', '${content.replace(/'/g, "''")}', current_timestamp)
    `);
  } catch (e) {
    console.error("DuckDB Cache Error:", e);
  }
}

/**
 * 从本地 SQL 获取缓存的房间
 */
export async function getCachedRoom(roomId: string) {
  try {
    const { conn } = await getDuckDB();
    const result = await conn.query(`
      SELECT * FROM room_cache WHERE id = '${roomId}'
    `);
    return result.toArray()[0];
  } catch (e) {
    return null;
  }
}
