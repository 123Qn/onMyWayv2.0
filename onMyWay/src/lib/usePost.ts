import { useEffect, useState } from "react";
import { getPostById, type FeedPost } from "./feed";
import { fetchPost } from "./tripsApi";

/**
 * A post by id: from the posts already loaded, otherwise fetched from the server
 * (e.g. an older post opened from a notification). missing = it really doesn't exist.
 */
export function usePost(id: number) {
  const [post, setPost] = useState<FeedPost | undefined>(() => getPostById(id));
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const known = getPostById(id);
    setPost(known);
    setMissing(false);
    if (known || !Number.isInteger(id) || id <= 0) {
      if (!known) setMissing(true);
      return;
    }
    let alive = true;
    fetchPost(id).then(
      (p) => alive && setPost(p),
      () => alive && setMissing(true)
    );
    return () => {
      alive = false;
    };
  }, [id]);

  return { post, missing };
}
