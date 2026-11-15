const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const mediaModel = require("../models/media.model");

// Development storage: files on local disk, served from /uploads.
// The media table already has s3_key/status, so switching to S3 signed uploads later
// only changes this file.
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSIONS = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/heic": ".heic" };

const httpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const upload = multer({
    storage: multer.diskStorage({
        destination: UPLOAD_DIR,
        filename: (req, file, cb) => cb(null, crypto.randomUUID() + EXTENSIONS[file.mimetype]),
    }),
    limits: { fileSize: MAX_BYTES, files: 1 },
    fileFilter: (req, file, cb) =>
        EXTENSIONS[file.mimetype] ? cb(null, true) : cb(httpError(415, "Only JPEG, PNG, WebP or HEIC images are allowed.")),
});

// Raw upload: the request body is the image itself (Content-Type: image/jpeg ...).
// Simpler for mobile clients than multipart.
const rawBody = express.raw({ type: Object.keys(EXTENSIONS), limit: MAX_BYTES });

const saveRawImage = (req, res, next) =>
    rawBody(req, res, (err) => {
        if (err) return next(err.type === "entity.too.large" ? httpError(413, "Image is larger than 10 MB.") : err);
        const mimetype = (req.get("content-type") || "").split(";")[0].trim();
        if (!EXTENSIONS[mimetype] || !Buffer.isBuffer(req.body) || req.body.length === 0) {
            return next(httpError(415, "Only JPEG, PNG, WebP or HEIC images are allowed."));
        }
        const filename = crypto.randomUUID() + EXTENSIONS[mimetype];
        fs.writeFile(path.join(UPLOAD_DIR, filename), req.body, (writeErr) => {
            if (writeErr) return next(writeErr);
            req.file = { filename, mimetype, size: req.body.length };
            next();
        });
    });

// Accepts either multipart/form-data with a "file" field or a raw image body;
// turns multer errors into HTTP errors
const singleImage = (req, res, next) => {
    if (!req.is("multipart/form-data")) return saveRawImage(req, res, next);
    upload.single("file")(req, res, (err) => {
        if (!err) return next();
        if (err instanceof multer.MulterError) {
            return next(httpError(err.code === "LIMIT_FILE_SIZE" ? 413 : 400, err.code === "LIMIT_FILE_SIZE" ? "Image is larger than 10 MB." : err.message));
        }
        next(err);
    });
};

// Absolute URL for a stored key, e.g. http://192.168.0.12:3000/uploads/<file>
const publicUrl = (req, key) => {
    if (!key) return null;
    const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
    return `${base}/${key}`;
};

const saveUpload = async (ownerId, file) => {
    if (!file) throw httpError(400, "No image uploaded.");
    return mediaModel.createMedia({
        ownerId,
        key: `uploads/${file.filename}`,
        mimeType: file.mimetype,
        sizeBytes: file.size,
    });
};

module.exports = { UPLOAD_DIR, singleImage, publicUrl, saveUpload };
