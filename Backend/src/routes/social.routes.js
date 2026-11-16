const express = require("express");
const router = express.Router();

const postController = require("../controllers/post.controller");
const mediaService = require("../services/media.service");
const requireAuth = require("../middleware/auth.middleware");
const profileService = require("../services/profile.service");
const communityService = require("../services/community.service");

const ok = (res, data) => res.status(200).json({ success: true, data });

// Auth per route: this router is mounted at the API root, so a router-wide guard would
// turn every unknown path into a 401 instead of a 404.

// multipart/form-data with one image in the "file" field
router.post("/media", requireAuth, mediaService.singleImage, postController.uploadMedia);

// Profile: travel stats from verified posts, frame and pinned badges
router.get("/users/:id/profile", requireAuth, async (req, res) => ok(res, await profileService.getProfile(req.user, req.params.id)));
router.patch("/users/me/rewards", requireAuth, async (req, res) => ok(res, await profileService.updateRewards(req.user, req.body)));
router.patch("/users/me", requireAuth, async (req, res) =>
    ok(res, await profileService.updateProfile(req.user, req.body, (key) => mediaService.publicUrl(req, key))));
router.get("/users/:id/followers", requireAuth, async (req, res) => ok(res, await communityService.listFollows(req.user, req.params.id, "followers")));
router.get("/users/:id/following", requireAuth, async (req, res) => ok(res, await communityService.listFollows(req.user, req.params.id, "following")));
router.get("/countries", requireAuth, async (req, res) => ok(res, communityService.listCountries()));

// Community: find travelers, people to follow, leaderboards
router.get("/travelers", requireAuth, async (req, res) => ok(res, await communityService.listTravelers(req.user, req.query)));
router.get("/travelers/suggested", requireAuth, async (req, res) => ok(res, await communityService.suggestTravelers(req.user, req.query)));
router.get("/leaderboard", requireAuth, async (req, res) => ok(res, await communityService.leaderboard(req.user, req.query)));

router.post("/users/:id/follow", requireAuth, postController.follow);
router.delete("/users/:id/follow", requireAuth, postController.unfollow);

module.exports = router;
