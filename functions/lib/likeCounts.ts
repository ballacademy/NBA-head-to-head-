/** Recompute denormalized like counts from source tables in one UPDATE. */

export const syncCommunityPostLikeCount = async (
  db: D1Database,
  postId: string,
) => {
  await db
    .prepare(
      `UPDATE community_posts
       SET like_count = (
         SELECT COUNT(*)
         FROM community_post_likes
         WHERE post_id = ?
       )
       WHERE id = ?`,
    )
    .bind(postId, postId)
    .run();

  const row = await db
    .prepare(`SELECT like_count FROM community_posts WHERE id = ?`)
    .bind(postId)
    .first<{ like_count: number }>();

  return Math.max(0, Math.round(Number(row?.like_count ?? 0)));
};

export const syncTierListLikeCount = async (
  db: D1Database,
  tierListId: string,
  updatedAt: string,
) => {
  await db
    .prepare(
      `UPDATE published_tier_lists
       SET like_count = (
         SELECT COUNT(*)
         FROM tier_list_likes
         WHERE tier_list_id = ?
       ),
           updated_at = ?
       WHERE id = ?`,
    )
    .bind(tierListId, updatedAt, tierListId)
    .run();

  const row = await db
    .prepare(`SELECT like_count FROM published_tier_lists WHERE id = ?`)
    .bind(tierListId)
    .first<{ like_count: number }>();

  return Math.max(0, Math.round(Number(row?.like_count ?? 0)));
};
