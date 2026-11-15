const express = require("express");
const router = express.Router();

const notificationModel = require("../models/notification.model");
const mediaService = require("../services/media.service");
const requireAuth = require("../middleware/auth.middleware");

router.use(requireAuth);

const ok = (res, data) => res.status(200).json({ success: true, data });

router.get("/", async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const before = req.query.before && !Number.isNaN(Date.parse(req.query.before)) ? req.query.before : null;
    const rows = await notificationModel.list(req.user.id, { before, limit });
    ok(
        res,
        rows.map((r) => ({
            id: String(r.id),
            type: r.type,
            read: r.read_at !== null,
            createdAt: r.created_at.toISOString(),
            actor: { id: r.actor_id, name: r.actor_name, frame: r.actor_frame },
            post: r.post_id
                ? {
                      id: Number(r.post_id),
                      kind: r.post_kind,
                      title: r.post_title ?? r.post_caption ?? "",
                      imageUrl: mediaService.publicUrl(req, r.post_cover_key) ?? undefined,
                  }
                : undefined,
            comment: r.comment_body ?? undefined,
        }))
    );
});

router.get("/unread-count", async (req, res) => ok(res, { count: await notificationModel.unreadCount(req.user.id) }));

router.post("/read", async (req, res) => {
    await notificationModel.markAllRead(req.user.id);
    ok(res, { count: 0 });
});

module.exports = router;
