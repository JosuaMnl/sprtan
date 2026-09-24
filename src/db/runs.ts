import { db as defaultDb, type SprtanDB } from './database'
import type { Run } from './types'

/**
 * Runs are split across two stores (see `RunSummary`). These helpers are the
 * only code that should touch both, so a summary and its track are always
 * written and deleted together.
 */

/** Save a finished run: summary and track in one transaction. */
export async function saveRun(run: Run, database: SprtanDB = defaultDb): Promise<void> {
  const { path, ...summary } = run
  await database.transaction('rw', database.runs, database.runPaths, async () => {
    await database.runs.add(summary)
    await database.runPaths.add({ id: run.id, path })
  })
}

/**
 * Load one run with its track, or undefined when it doesn't exist. A summary
 * whose track is missing comes back with an empty path rather than failing.
 */
export async function getRun(
  id: string,
  database: SprtanDB = defaultDb,
): Promise<Run | undefined> {
  // Plain sequential awaits: this runs inside `useLiveQuery`, which must see
  // every table read to know when to re-run.
  const summary = await database.runs.get(id)
  if (!summary) return undefined
  const track = await database.runPaths.get(id)
  return { ...summary, path: track?.path ?? [] }
}

/** Delete a run's summary and track together. */
export async function deleteRun(id: string, database: SprtanDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.runs, database.runPaths, async () => {
    await database.runs.delete(id)
    await database.runPaths.delete(id)
  })
}
