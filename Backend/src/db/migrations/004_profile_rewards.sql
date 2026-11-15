-- 004: profile customisation — the avatar frame a user wears and the badges pinned to their profile
ALTER TABLE users
  ADD COLUMN avatar_frame  VARCHAR(20) NOT NULL DEFAULT 'classic',
  ADD COLUMN pinned_badges TEXT[]      NOT NULL DEFAULT '{}' CHECK (cardinality(pinned_badges) <= 3);
