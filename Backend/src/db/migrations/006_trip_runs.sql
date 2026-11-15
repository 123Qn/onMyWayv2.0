-- 006: trip runs — a user following a trip post with the in-app map.
-- The app sends a GPS point every few minutes; the server keeps the track, the real distance
-- and which stops were reached.
CREATE TABLE trip_runs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id       BIGINT        REFERENCES posts(id) ON DELETE SET NULL,
  started_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  distance_km   NUMERIC(9,3)  NOT NULL DEFAULT 0,
  visited_stops BIGINT[]      NOT NULL DEFAULT '{}',   -- post_stops ids reached (within ~250 m)
  last_lat      NUMERIC(9,6),
  last_lng      NUMERIC(9,6),
  last_at       TIMESTAMPTZ
);
CREATE INDEX trip_runs_user_idx ON trip_runs (user_id, started_at DESC);
CREATE INDEX trip_runs_post_idx ON trip_runs (post_id);
-- At most one running trip per user
CREATE UNIQUE INDEX trip_runs_active_idx ON trip_runs (user_id) WHERE ended_at IS NULL;

CREATE TABLE trip_run_points (
  run_id      BIGINT       NOT NULL REFERENCES trip_runs(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ  NOT NULL,
  latitude    NUMERIC(9,6) NOT NULL CHECK (latitude  BETWEEN -90  AND 90),
  longitude   NUMERIC(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_m  REAL,
  PRIMARY KEY (run_id, recorded_at)
);
