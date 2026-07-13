import type { NodePgDatabase, NodePgTransaction } from 'drizzle-orm/node-postgres';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;
export type Tx = NodePgTransaction<typeof schema, ExtractTablesWithRelations<typeof schema>>;

// A service write method takes this so it can run standalone (default) or
// inside a caller-supplied transaction (GC-061 — write + audit-log record
// in one transaction, so a failed audit insert rolls back the write too).
export type DbOrTx = Db | Tx;
