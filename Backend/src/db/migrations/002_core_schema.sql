-- 002: core onMyWay schema
-- Matches the architecture diagram: Auth API (sessions, OAuth), Trip API (places, trips,
-- posts, social), Media API (S3 objects) and the AI travel assistant.

-- ---------------------------------------------------------------------------
-- Shared: keep updated_at current
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Users: allow Google-only accounts (no password) + profile fields
-- ---------------------------------------------------------------------------
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT,
  ADD COLUMN IF NOT EXISTS bio          VARCHAR(300),
  ADD COLUMN IF NOT EXISTS country_code CHAR(2),               -- ISO 3166-1, e.g. 'AU', 'VN'
  ADD COLUMN IF NOT EXISTS timezone     VARCHAR(64),           -- IANA, e.g. 'Australia/Sydney'
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth: third-party identities (Google OAuth) and refresh-token sessions
-- ---------------------------------------------------------------------------
CREATE TABLE auth_identities (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         VARCHAR(20)  NOT NULL CHECK (provider IN ('google', 'apple')),
  provider_user_id VARCHAR(255) NOT NULL,                       -- the "sub" claim of the ID token
  email            VARCHAR(255),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);
CREATE INDEX auth_identities_user_idx ON auth_identities (user_id);

-- One row per logged-in device. Store a SHA-256 hash of the refresh token, never the token.
CREATE TABLE sessions (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id            INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash CHAR(64)     NOT NULL UNIQUE,
  device_name        VARCHAR(100),
  user_agent         TEXT,
  ip_address         INET,
  expires_at         TIMESTAMPTZ  NOT NULL,
  revoked_at         TIMESTAMPTZ,
  last_used_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX sessions_user_active_idx ON sessions (user_id) WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------------
-- Media: S3 objects uploaded via signed URL
-- Flow: API creates row (status 'pending') + returns signed PUT URL -> app uploads to S3
--       -> app confirms -> status 'ready'.
-- ---------------------------------------------------------------------------
CREATE TABLE media (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  s3_key      VARCHAR(512) NOT NULL UNIQUE,
  mime_type   VARCHAR(100) NOT NULL,
  size_bytes  BIGINT       CHECK (size_bytes >= 0),
  width       INTEGER,
  height      INTEGER,
  status      VARCHAR(10)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'deleted')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX media_owner_idx ON media (owner_id);

-- ---------------------------------------------------------------------------
-- Places: destinations. best_months + category/tags are what the AI bot filters on
-- ("which beach is best this season?").
-- ---------------------------------------------------------------------------
CREATE TABLE places (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name           VARCHAR(150)  NOT NULL,
  slug           VARCHAR(160)  NOT NULL UNIQUE,
  description    TEXT,
  category       VARCHAR(30)   NOT NULL
                 CHECK (category IN ('beach', 'island', 'mountain', 'city', 'nature', 'culture', 'food', 'other')),
  tags           TEXT[]        NOT NULL DEFAULT '{}',          -- e.g. {snorkeling,family,surfing}
  country_code   CHAR(2)       NOT NULL,
  region         VARCHAR(100),                                 -- state / province
  city           VARCHAR(100),
  latitude       NUMERIC(9,6)  CHECK (latitude  BETWEEN -90  AND 90),
  longitude      NUMERIC(9,6)  CHECK (longitude BETWEEN -180 AND 180),
  best_months    SMALLINT[]    NOT NULL DEFAULT '{}'           -- 1..12
                 CHECK (best_months <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::SMALLINT[]),
  season_notes   TEXT,                                         -- e.g. "Avoid Oct-Dec: rainy season"
  cover_media_id BIGINT        REFERENCES media(id) ON DELETE SET NULL,
  created_by     INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX places_category_idx    ON places (category);
CREATE INDEX places_country_idx     ON places (country_code);
CREATE INDEX places_best_months_idx ON places USING GIN (best_months);
CREATE INDEX places_tags_idx        ON places USING GIN (tags);
CREATE TRIGGER places_updated_at BEFORE UPDATE ON places
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Trips: a user's plan, made of ordered stops at places
-- ---------------------------------------------------------------------------
CREATE TABLE trips (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          VARCHAR(150) NOT NULL,
  description    TEXT,
  start_date     DATE,
  end_date       DATE,
  visibility     VARCHAR(10)  NOT NULL DEFAULT 'private'
                 CHECK (visibility IN ('private', 'followers', 'public')),
  cover_media_id BIGINT       REFERENCES media(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE INDEX trips_user_idx ON trips (user_id, created_at DESC);
CREATE TRIGGER trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE trip_stops (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id    BIGINT      NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  place_id   BIGINT      NOT NULL REFERENCES places(id) ON DELETE RESTRICT,
  position   INTEGER     NOT NULL CHECK (position >= 0),
  day_number INTEGER     CHECK (day_number >= 1),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id, position) DEFERRABLE INITIALLY DEFERRED   -- lets you reorder in one transaction
);
CREATE INDEX trip_stops_place_idx ON trip_stops (place_id);

-- ---------------------------------------------------------------------------
-- Social: posts ("moments"), photos, likes, comments, follows
-- ---------------------------------------------------------------------------
CREATE TABLE posts (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id    BIGINT      REFERENCES trips(id)  ON DELETE SET NULL,
  place_id   BIGINT      REFERENCES places(id) ON DELETE SET NULL,
  caption    TEXT,
  visibility VARCHAR(10) NOT NULL DEFAULT 'public'
             CHECK (visibility IN ('private', 'followers', 'public')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX posts_feed_idx  ON posts (created_at DESC) WHERE visibility = 'public';
CREATE INDEX posts_user_idx  ON posts (user_id, created_at DESC);
CREATE INDEX posts_place_idx ON posts (place_id);
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE post_media (
  post_id  BIGINT  NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_id BIGINT  NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, media_id)
);

CREATE TABLE post_likes (
  post_id    BIGINT      NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX post_likes_user_idx ON post_likes (user_id);

CREATE TABLE comments (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id    BIGINT      NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX comments_post_idx ON comments (post_id, created_at);

CREATE TABLE follows (
  follower_id  INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX follows_following_idx ON follows (following_id);

-- ---------------------------------------------------------------------------
-- AI travel assistant: chat history (bottom-right bot)
-- ---------------------------------------------------------------------------
CREATE TABLE ai_conversations (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(150),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX ai_conversations_user_idx ON ai_conversations (user_id, updated_at DESC);
CREATE TRIGGER ai_conversations_updated_at BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE ai_messages (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id BIGINT      NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT        NOT NULL,
  place_ids       BIGINT[]    NOT NULL DEFAULT '{}',   -- places the bot suggested (for cards in the app)
  model           VARCHAR(60),
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ai_messages_conversation_idx ON ai_messages (conversation_id, created_at);