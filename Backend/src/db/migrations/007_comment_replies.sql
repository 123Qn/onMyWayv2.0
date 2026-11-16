-- 007: replies to comments, so a conversation can go back and forth (A -> B -> C ...).
-- One level of nesting like most social apps: parent_id is always the thread's top-level
-- comment, and reply_to_user_id is whom the reply answers (shown as @name).
ALTER TABLE comments
  ADD COLUMN parent_id        BIGINT  REFERENCES comments(id) ON DELETE CASCADE,
  ADD COLUMN reply_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX comments_parent_idx ON comments (parent_id);

-- "X replied to your comment"
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'answer', 'reply', 'follow'));
