const express = require("express");
const router = express.Router();

const tripRunService = require("../services/tripRun.service");
const requireAuth = require("../middleware/auth.middleware");
const mediaService = require("../services/media.service");

// Auth per route: mounted at the API root, so a router-wide guard would 401 unknown paths
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// Road route through ?points=lat,lng;lat,lng;...
router.get("/route", requireAuth, async (req, res) => ok(res, await tripRunService.getRoute(req.query.points)));

router.post("/trip-runs", requireAuth, async (req, res) => ok(res, await tripRunService.startRun(req.user, req.body), 201));
router.get("/trip-runs", requireAuth, async (req, res) =>
    ok(res, await tripRunService.listRuns(req.user, req.query, (key) => mediaService.publicUrl(req, key))));
router.get("/trip-runs/active", requireAuth, async (req, res) => ok(res, await tripRunService.activeRun(req.user)));
router.post("/trip-runs/:id/points", requireAuth, async (req, res) => ok(res, await tripRunService.addPoints(req.user, req.params.id, req.body)));
router.post("/trip-runs/:id/end", requireAuth, async (req, res) => ok(res, await tripRunService.endRun(req.user, req.params.id)));
router.get("/trip-runs/:id/track", requireAuth, async (req, res) => ok(res, await tripRunService.getTrack(req.user, req.params.id)));

module.exports = router;
