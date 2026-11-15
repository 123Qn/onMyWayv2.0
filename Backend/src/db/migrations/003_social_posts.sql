-- 003: social posts as the app creates them
-- A post is a trip (title, cover, ordered stops), a moment (one live photo) or a question.
-- Stops belong to the post itself and carry their own pin; they don't need a row in places.

ALTER TABLE posts
  ADD COLUMN kind           VARCHAR(10)  NOT NULL DEFAULT 'trip' CHECK (kind IN ('trip', 'moment', 'question')),
  ADD COLUMN title          VARCHAR(120),
  ADD COLUMN category       VARCHAR(30)  NOT NULL DEFAULT 'other'
             CHECK (category IN ('beach', 'island', 'mountain', 'city', 'nature', 'culture', 'food', 'other')),
  ADD COLUMN place_name     VARCHAR(150),
  ADD COLUMN country_name   VARCHAR(100),
  ADD COLUMN country_code   CHAR(2),
  ADD COLUMN cover_media_id BIGINT       REFERENCES media(id) ON DELETE SET NULL,
  ADD COLUMN trip_days      SMALLINT     CHECK (trip_days BETWEEN 1 AND 365),
  ADD COLUMN trip_day       SMALLINT     CHECK (trip_day BETWEEN 1 AND 365),
  -- Every pin came from photo/device GPS. Recomputed by the API, never trusted from the client.
  ADD COLUMN verified       BOOLEAN      NOT NULL DEFAULT FALSE,
  -- Moderation: reported posts can be hidden without deleting them
  ADD COLUMN status         VARCHAR(10)  NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden'));

CREATE INDEX posts_moments_idx ON posts (created_at DESC) WHERE kind = 'moment';

CREATE TABLE post_stops (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id    BIGINT       NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  position   INTEGER      NOT NULL CHECK (position >= 0),
  name       VARCHAR(100) NOT NULL,
  caption    TEXT,
  media_id   BIGINT       REFERENCES media(id) ON DELETE SET NULL,
  latitude   NUMERIC(9,6) NOT NULL CHECK (latitude  BETWEEN -90  AND 90),
  longitude  NUMERIC(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  -- TRUE when the pin is the photo's own GPS; FALSE when the user placed it on the map
  from_photo BOOLEAN      NOT NULL DEFAULT FALSE,
  UNIQUE (post_id, position)
);

-- "Want to go" list
CREATE TABLE post_saves (
  post_id    BIGINT      NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX post_saves_user_idx ON post_saves (user_id, created_at DESC);
