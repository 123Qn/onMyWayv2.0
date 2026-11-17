-- 008: the travel assistant also suggests community trips/moments, shown as cards under its answer
ALTER TABLE ai_messages ADD COLUMN post_ids BIGINT[] NOT NULL DEFAULT '{}';
