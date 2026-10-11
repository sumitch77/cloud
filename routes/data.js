const express = require("express");
const path = require("path");
const routerdata = express.Router();
const dotenv = require("dotenv");
dotenv.config();
const { Resend } = require("resend");
const resendClient = new Resend(process.env.TOKEN);
const { check } = require("express-validator");
const {
  EmailLimiter,
  TimeLimiter,
  validate,
  upload,
  docupload,
  uploadFile,
  cloudinary,
} = require("../utils/ratelimit");
const {
  imageUploadLimiter,
  docUploadLimiter,
  credentialUploadLimiter,
  textUploadLimiter,
  generalUploadLimiter,
} = require("../utils/datalimiter");
const { supabase } = require("../utils/supabase");
const { login, loginother } = require("../utils/helper");
const multer = require("multer");
const crypto = require("crypto");
const {
  client,
  cacheData,
  clearUserDashboardCache,
  clearPublicDashboardCache,
} = require("../utils/redisHelper");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB (client uses the same limit)

/* ---------- Upload: text ---------- */
// Anonymous uploads are always public. Logged-in uploads are private by default
// (the owner can toggle them later). Column name in DB is `is_public`.
routerdata.post("/upload/text", textUploadLimiter, async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res
      .status(400)
      .json({ success: false, message: "Title and content are required" });
  }
  if (typeof title !== "string" || typeof content !== "string") {
    return res.status(400).json({ success: false, message: "Invalid Data" });
  }
  if (title.length > 100 || content.length > 10000) {
    return res
      .status(400)
      .json({ success: false, message: "Title or content is too long" });
  }

  const loggedIn = Boolean(req.session.email);

  const { error } = await supabase
    .schema("cloud")
    .from("upload_text")
    .insert({
      email: req.session.email || "without login",
      title,
      value: content,
      is_public: !loggedIn,
    });

  if (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Database error",
    });
  }

  await Promise.all([
    clearPublicDashboardCache(),
    loggedIn ? clearUserDashboardCache(req.session.email) : null,
  ]);

  return res
    .status(200)
    .json({ success: true, message: "Text uploaded successfully" });
});

/* ---------- Upload: credentials (always private) ---------- */
routerdata.post(
  "/upload/credentials",
  loginother,
  generalUploadLimiter,
  credentialUploadLimiter,
  async (req, res) => {
    if (!req.session.userId || !req.session.email) {
      return res
        .status(401)
        .json({ success: false, message: "Login to upload credentials" });
    }
    const { title, username, password } = req.body;

    if (!title || !username || !password) {
      return res.status(400).json({
        success: false,
        message: "Title, username, and password are required",
      });
    }
    if (
      typeof title !== "string" ||
      typeof username !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({ success: false, message: "Invalid Data" });
    }
    if (title.length > 100 || username.length > 100 || password.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Title or username or password is too long",
      });
    }

    const { error } = await supabase
      .schema("cloud")
      .from("upload_credentials")
      .insert({
        email: req.session.email,
        title,
        username,
        password,
      });

    if (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Database error",
      });
    }
    await clearUserDashboardCache(req.session.email);
    return res
      .status(200)
      .json({ success: true, message: "Credentials uploaded successfully" });
  },
);

/* ---------- Upload: image (private by default) ---------- */
routerdata.post(
  "/upload/image",
  loginother,
  generalUploadLimiter,
  imageUploadLimiter,
  upload.single("file"),
  async (req, res) => {
    if (!req.session.userId || !req.session.email) {
      return res.status(401).json({
        success: false,
        message: "Login to upload image",
      });
    }

    const { title } = req.body;
    const file = req.file;

    if (!title || !file) {
      return res.status(400).json({
        success: false,
        message: "Title and image are required",
      });
    }

    if (typeof title !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid data",
      });
    }

    if (title.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Title is too long",
      });
    }
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: "File size should be less than 5mb",
      });
    }

    try {
      const result = await uploadFile(file);

      const { error } = await supabase
        .schema("cloud")
        .from("upload_images")
        .insert({
          email: req.session.email,
          title,
          url: result.secure_url,
          is_public: false,
        });

      if (error) {
        console.error(error);
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }
      await clearUserDashboardCache(req.session.email);

      return res.status(200).json({
        success: true,
        message: "Image uploaded successfully",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Image upload failed",
      });
    }
  },
);

/* ---------- Upload: doc (private by default) ---------- */
routerdata.post(
  "/upload/doc",
  loginother,
  generalUploadLimiter,
  docUploadLimiter,
  docupload.single("file"),
  async (req, res) => {
    if (!req.session.userId || !req.session.email) {
      return res.status(401).json({
        success: false,
        message: "Login to upload Doc",
      });
    }

    const { title } = req.body;
    const file = req.file;

    if (!title || !file) {
      return res.status(400).json({
        success: false,
        message: "Title and document are required",
      });
    }
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: "File size should be less than 5mb",
      });
    }

    if (typeof title !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid data",
      });
    }

    if (title.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Title is too long",
      });
    }

    try {
      const result = await uploadFile(file);

      const { error } = await supabase
        .schema("cloud")
        .from("upload_docs")
        .insert({
          email: req.session.email,
          title,
          url: result.secure_url,
          is_public: false,
        });

      if (error) {
        console.error(error);
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }
      await clearUserDashboardCache(req.session.email);

      return res.status(200).json({
        success: true,
        message: "Doc uploaded successfully",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Doc upload failed",
      });
    }
  },
);

/* ---------- Public dashboard ---------- */
// Rows returned by get_all_public_uploads must come from `is_public = true`.
// `userEmail` lets the client know which public items belong to the viewer
// (so only the owner sees the visibility toggle).
routerdata.get("/dashboard/data", async (req, res) => {
  const { page, type } = req.query;

  if (
    !page ||
    !type ||
    type !== "public" ||
    !Number.isInteger(Number(page)) ||
    Number(page) < 1
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid request",
    });
  }

  try {
    const data = await cacheData(
      `dashboard:public:page:${Number(page)}`,
      300,
      async () => {
        const { data, error } = await supabase
          .schema("cloud")
          .rpc("get_all_public_uploads", {
            page_num: Number(page),
          });

        if (error) throw error;

        return data || [];
      },
    );

    return res.json({
      login: Boolean(req.session.userId),
      username: req.session.userName || "",
      userEmail: req.session.email || "",
      success: true,
      data,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch data",
    });
  }
});

/* ---------- User dashboard ---------- */
routerdata.get("/dashboard/data2", async (req, res) => {
  if (!req.session.userId) {
    return res
      .status(401)
      .json({ success: false, message: "Login to view data" });
  }
  if (!req.session.email) {
    return res.status(403).json({
      success: false,
      message:
        "There is some error with your account. Try logout and login again, or contact support.",
    });
  }

  const { page, type } = req.query;
  if (!page || !type) {
    return res
      .status(400)
      .json({ success: false, message: "Malicious Request" });
  }

  const pageNum = Number(page);
  if (!Number.isInteger(pageNum) || pageNum < 1) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid request type" });
  }
  if (pageNum > 10) {
    return res.status(400).json({
      success: false,
      message: "Page number too high",
    });
  }
  if (!["text", "credentials", "images", "docs", "all"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Invalid request type",
    });
  }

  try {
    const data = await cacheData(
      `dashboard:user:${req.session.email}:page:${pageNum}:type:${type}`,
      300,
      async () => {
        const { data, error } = await supabase
          .schema("cloud")
          .rpc("get_user_uploads", {
            user_email: req.session.email,
            page_num: pageNum,
            filter_type: type,
          });

        if (error) throw error;

        return data || [];
      },
    );

    res.json({
      login: true,
      username: req.session.userName || "",
      userEmail: req.session.email,
      success: true,
      data,
    });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

/* ---------- Toggle visibility ---------- */
routerdata.post("/visibility", async (req, res) => {
  const email = req.session?.email;
  if (!email)
    return res.status(401).json({ success: false, message: "Login required" });

  const TABLES = {
    text: "upload_text",
    credentials: "upload_credentials",
    images: "upload_images",
    docs: "upload_docs",
  };
  const { type, id, public: isPublic } = req.body;
  const table = Object.prototype.hasOwnProperty.call(TABLES, type)
    ? TABLES[type]
    : null;

  if (
    !table ||
    id === undefined ||
    id === null ||
    typeof isPublic !== "boolean"
  ) {
    return res.status(400).json({ success: false, message: "Invalid request" });
  }

  if (type === "credentials") {
    return res.status(400).json({
      success: false,
      message: "Credentials are always private",
    });
  }

  const { data, error } = await supabase
    .schema("cloud")
    .from(table)
    .update({ is_public: isPublic })
    .eq("id", id)
    .eq("email", email)
    .select("id");

  if (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Could not update" });
  }
  if (!data?.length) {
    return res.status(404).json({ success: false, message: "Item not found" });
  }

  await Promise.all([
    clearUserDashboardCache(email),
    clearPublicDashboardCache(),
  ]);

  res.json({ success: true, public: isPublic });
});

module.exports = { routerdata };
