const postService = require("../services/post.service");
const mediaService = require("../services/media.service");

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const urlFor = (req) => (key) => mediaService.publicUrl(req, key);

const uploadMedia = async (req, res) => {
    const media = await mediaService.saveUpload(req.user.id, req.file);
    ok(res, { id: Number(media.id), url: mediaService.publicUrl(req, media.key) }, 201);
};

const feed = async (req, res) => ok(res, await postService.listFeed(req.user, req.query, urlFor(req)));
const saved = async (req, res) => ok(res, await postService.listSaved(req.user, req.query, urlFor(req)));
const create = async (req, res) => ok(res, await postService.createPost(req.user, req.body, urlFor(req)), 201);
const show = async (req, res) => ok(res, await postService.getPost(req.user, req.params.id, urlFor(req)));

const remove = async (req, res) => {
    await postService.deletePost(req.user, req.params.id);
    ok(res, null);
};

const like = async (req, res) => ok(res, await postService.setLike(req.user, req.params.id, true));
const unlike = async (req, res) => ok(res, await postService.setLike(req.user, req.params.id, false));
const save = async (req, res) => ok(res, await postService.setSave(req.user, req.params.id, true));
const unsave = async (req, res) => ok(res, await postService.setSave(req.user, req.params.id, false));

const comments = async (req, res) => ok(res, await postService.listComments(req.params.id));
const comment = async (req, res) => ok(res, await postService.addComment(req.user, req.params.id, req.body), 201);

const follow = async (req, res) => ok(res, await postService.setFollow(req.user, req.params.id, true));
const unfollow = async (req, res) => ok(res, await postService.setFollow(req.user, req.params.id, false));

module.exports = {
    uploadMedia,
    feed,
    saved,
    create,
    show,
    remove,
    like,
    unlike,
    save,
    unsave,
    comments,
    comment,
    follow,
    unfollow,
};
