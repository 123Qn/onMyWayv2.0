const express = require("express");
const router = express.Router();

const postController = require("../controllers/post.controller");
const mediaService = require("../services/media.service");
const requireAuth = require("../middleware/auth.middleware");
const profileService = require("../services/profile.service");

const ok = (res, data) => res.status(200).json({ success: true, data });

// Auth per route: this router is mounted at the API root, so a router-wide guard would
// turn every unknown path into a 401 instead of a 404.

// multipart/form-data with one image in the "file" field
router.post("/media", requireAuth, mediaService.singleImage, postController.uploadMedia);

// Profile: travel stats from verified posts, frame and pinned badges
router.get("/users/:id/profile", requireAuth, async (req, res) => ok(res, await profileService.getProfile(req.user, req.params.id)));
router.patch("/users/me/rewards", requireAuth, async (req, res) => ok(res, await profileService.updateRewards(req.user, req.body)));

router.post("/users/:id/follow", requireAuth, postController.follow);
router.delete("/users/:id/follow", requireAuth, postController.unfollow);

module.exports = router;
