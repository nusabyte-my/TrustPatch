CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY, status TEXT NOT NULL, contract_json TEXT NOT NULL,
  approval_json TEXT, approval_digest TEXT, approval_granted INTEGER NOT NULL DEFAULT 0,
  attempt INTEGER NOT NULL DEFAULT 0, proof_json TEXT, error TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  role TEXT NOT NULL, type TEXT NOT NULL, message TEXT NOT NULL,
  data_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_run_id ON events(run_id, id);
CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, sha256 TEXT NOT NULL, size_bytes INTEGER NOT NULL,
  path TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS evidence_run_id ON evidence(run_id);
CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, state TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL,
  summary TEXT NOT NULL, observed_json TEXT NOT NULL, source_files_json TEXT NOT NULL,
  evidence_ids_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS findings_run_id ON findings(run_id);
CREATE TABLE IF NOT EXISTS tool_calls (
  id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL, tool TEXT NOT NULL, status TEXT NOT NULL,
  result_json TEXT, created_at TEXT NOT NULL,
  CONSTRAINT tool_calls_run_key UNIQUE(run_id, idempotency_key)
);
