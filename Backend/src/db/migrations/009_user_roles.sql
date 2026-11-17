-- 009: official accounts (the onMyWay team / customer service). They have every badge and the top level,
-- whatever they have traveled; travel stats and leaderboards still use their real posts.
ALTER TABLE users
  ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'official'));
