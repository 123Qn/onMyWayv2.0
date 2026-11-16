const express = require("express");
const router = express.Router();

const postController = require("../controllers/post.controller");
const requireAuth = require("../middleware/auth.middleware");

router.use(requireAuth);

router.get("/", postController.feed);
router.post("/", postController.create);
router.get("/saved", postController.saved);  // before "/:id"
router.get("/:id", postController.show);
router.delete("/:id", postController.remove);

router.post("/:id/like", postController.like);
router.delete("/:id/like", postController.unlike);
router.post("/:id/save", postController.save);
router.delete("/:id/save", postController.unsave);

router.get("/:id/comments", postController.comments);
router.post("/:id/comments", postController.comment);

module.exports = router;
