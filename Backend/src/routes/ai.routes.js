const express = require("express");
const router = express.Router();

const aiService = require("../services/ai.service");
const mediaService = require("../services/media.service");
const requireAuth = require("../middleware/auth.middleware");

// Auth per route: mounted at the API root, so a router-wide guard would 401 unknown paths
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const urlFor = (req) => (key) => mediaService.publicUrl(req, key);

// Travel assistant
router.post("/ai/chat", requireAuth, async (req, res) => ok(res, await aiService.chat(req.user, req.body, urlFor(req))));
router.get("/ai/conversations", requireAuth, async (req, res) => ok(res, await aiService.listConversations(req.user)));
router.get("/ai/conversations/:id", requireAuth, async (req, res) => ok(res, await aiService.getConversation(req.user, req.params.id, urlFor(req))));
router.delete("/ai/conversations/:id", requireAuth, async (req, res) => {
  await aiService.deleteConversation(req.user, req.params.id);
  ok(res, null);
});

module.exports = router;
