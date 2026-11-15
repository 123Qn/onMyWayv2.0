-- 005: in-app notifications (likes, comments, answers to questions, new followers)
CREATE TABLE notifications (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- who receives it
  actor_id   INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- who did it
  type       VARCHAR(10) NOT NULL CHECK (type IN ('like', 'comment', 'answer', 'follow')),
  post_id    BIGINT      REFERENCES posts(id) ON DELETE CASCADE,
  comment_id BIGINT      REFERENCES comments(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id <> actor_id)
);
CREATE INDEX notifications_user_idx   ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON notifications (user_id) WHERE read_at IS NULL;
