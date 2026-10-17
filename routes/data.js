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

// type (used by the frontend) -> table name in the `cloud` schema
const TABLES = {
  text: "upload_text",
  credentials: "upload_credentials",
  images: "upload_images",
  docs: "upload_docs",
};

/* ---------- Credentials encryption ----------
 * Passwords are stored encrypted (AES-256-GCM) and decrypted only when sent to
 * their owner. The key comes from the CREDENTIALS_SECRET env variable.
 * Set it once in your .env and do NOT change it later, otherwise the passwords
 * that were already saved can no longer be decrypted.
 * Stored format:  enc:v1:<iv>:<authTag>:<ciphertext>   (all base64)
 * Rows without the "enc:v1:" prefix are old plain-text rows and are returned
 * as they are, so existing data keeps working.
 */
const SECRET_PREFIX = "enc:v1:";

function getCredentialKey() {
  const secret = process.env.CREDENTIALS_SECRET;
  if (!secret) throw new Error("CREDENTIALS_SECRET is not set in env");
  return crypto.createHash("sha256").update(secret).digest(); // 32 bytes
}

function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getCredentialKey(), iv);
  const data = Buffer.concat([
    cipher.update(String(plain), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return (
    SECRET_PREFIX + [iv, tag, data].map((b) => b.toString("base64")).join(":")
  );
}

function decryptSecret(stored) {
  if (typeof stored !== "string") return "";
  if (!stored.startsWith(SECRET_PREFIX)) return stored; // old plain-text row
  try {
    const [iv, tag, data] = stored
      .slice(SECRET_PREFIX.length)
      .split(":")
      .map((part) => Buffer.from(part, "base64"));
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getCredentialKey(),
      iv,
    );
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  } catch (err) {
    console.error("Credential decrypt failed:", err.message);
    return "";
  }
}

/* ---------- Response shaping ----------
 * - never sends other people's email addresses to the browser
 * - adds `is_owner` so the frontend knows who may edit / delete / toggle
 * - decrypts credential passwords (after the Redis cache, so the cache only
 *   ever holds encrypted values)
 * - credentials have no is_public column and are always private
 */
function prepareItem(type, row, sessionEmail, ownAll) {
  const { email, ...rest } = row;
  const item = {
    ...rest,
    is_owner: ownAll || (Boolean(sessionEmail) && email === sessionEmail),
  };
  if (type === "credentials") {
    item.password = decryptSecret(row.password);
    item.is_public = false;
  }
  return item;
}

function shapeGrouped(grouped, sessionEmail, ownAll = false) {
  const out = { text: [], credentials: [], images: [], docs: [] };
  Object.keys(out).forEach((type) => {
    const rows = grouped && Array.isArray(grouped[type]) ? grouped[type] : [];
    out[type] = rows.map((row) => prepareItem(type, row, sessionEmail, ownAll));
  });
  return out;
}

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

/* ---------- Upload: credentials (always private, password encrypted) ---------- */
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

    let encryptedPassword;
    try {
      encryptedPassword = encryptSecret(password);
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    const { error } = await supabase
      .schema("cloud")
      .from("upload_credentials")
      .insert({
        email: req.session.email,
        title,
        username,
        password: encryptedPassword,
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
// get_all_public_uploads must filter on `is_public = true` and should return
// the `email` column (it is removed again before the response is sent; it is
// only used here to work out `is_owner`).
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
      admin: Boolean(req.session.admin),
      success: true,
      // credentials are never public, drop them even if the RPC returned some
      data: shapeGrouped(
        { ...(data || {}), credentials: [] },
        req.session.email,
      ),
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
      admin: Boolean(req.session.admin),
      success: true,
      // every row here belongs to the logged-in user
      data: shapeGrouped(data, req.session.email, true),
    });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

/* ---------- Search ----------
 * type=public            -> public text / images / docs (anyone)
 * type=all|text|...      -> the logged-in user's own uploads
 * Matches the title and the main value of the item:
 *   text -> title + content, credentials -> title + username,
 *   images / docs -> title.   Passwords are never searched.
 */
const SEARCH_LIMIT = 50;
const SEARCH_FIELDS = {
  text: ["title", "value"],
  credentials: ["title", "username"],
  images: ["title"],
  docs: ["title"],
};

// escape LIKE wildcards so "50%" or "a_b" is searched literally
function escapeLike(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

async function searchTable(type, q, { publicOnly, email }) {
  const pattern = `%${escapeLike(q)}%`;

  const results = await Promise.all(
    SEARCH_FIELDS[type].map((field) => {
      let query = supabase
        .schema("cloud")
        .from(TABLES[type])
        .select("*")
        .ilike(field, pattern)
        .order("created_at", { ascending: false })
        .limit(SEARCH_LIMIT);

      query = publicOnly
        ? query.eq("is_public", true)
        : query.eq("email", email);
      return query;
    }),
  );

  const rows = new Map();
  for (const { data, error } of results) {
    if (error) throw error;
    (data || []).forEach((row) => rows.set(row.id, row));
  }

  return [...rows.values()]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, SEARCH_LIMIT);
}

routerdata.get("/dashboard/search", async (req, res) => {
  const { q, type } = req.query;

  if (typeof q !== "string" || typeof type !== "string") {
    return res.status(400).json({ success: false, message: "Invalid request" });
  }
  const term = q.trim();
  if (!term || term.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Search must be between 1 and 100 characters",
    });
  }

  const publicSearch = type === "public";

  if (!publicSearch) {
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
    if (!["text", "credentials", "images", "docs", "all"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request type" });
    }
  }

  const types = publicSearch
    ? ["text", "images", "docs"] // credentials are never public
    : type === "all"
      ? Object.keys(TABLES)
      : [type];

  try {
    const results = await Promise.all(
      types.map((t) =>
        searchTable(t, term, {
          publicOnly: publicSearch,
          email: req.session.email,
        }),
      ),
    );

    const grouped = { text: [], credentials: [], images: [], docs: [] };
    types.forEach((t, i) => {
      grouped[t] = results[i];
    });

    res.json({
      login: Boolean(req.session.userId),
      username: req.session.userName || "",
      admin: Boolean(req.session.admin),
      success: true,
      data: shapeGrouped(grouped, req.session.email, !publicSearch),
    });
  } catch (err) {
    console.error("Error searching:", err);
    res.status(500).json({ success: false, message: "Search failed" });
  }
});

/* ---------- Edit / delete helpers ---------- */

// Finds the row and decides if the current session may change it.
//  - the owner can change their own item
//  - an admin (req.session.admin) can also change any PUBLIC item
//    (never credentials, they are always private)
// Anything else gets "Item not found" so ids of private items are not revealed.
async function authorizeRecord(req, type, id) {
  const email = req.session.email;
  const columns = type === "credentials" ? "id,email" : "id,email,is_public";

  const { data: row, error } = await supabase
    .schema("cloud")
    .from(TABLES[type])
    .select(columns)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return { status: 500, message: "Database error" };
  }
  if (!row) return { status: 404, message: "Item not found" };

  const isOwner = row.email === email;
  const isAdminOnPublic =
    Boolean(req.session.admin) &&
    type !== "credentials" &&
    row.is_public === true;

  if (!isOwner && !isAdminOnPublic) {
    return { status: 404, message: "Item not found" };
  }
  return { row };
}

// Same limits as the upload routes. Images / docs: only the title can be edited.
function buildChanges(type, body) {
  const { title, content, username, password } = body;

  if (!title) return { error: "Title is required" };
  if (typeof title !== "string") return { error: "Invalid Data" };
  if (title.length > 100) return { error: "Title is too long" };

  if (type === "text") {
    if (!content) return { error: "Title and content are required" };
    if (typeof content !== "string") return { error: "Invalid Data" };
    if (content.length > 10000)
      return { error: "Title or content is too long" };
    return { changes: { title, value: content } };
  }

  if (type === "credentials") {
    if (!username || !password) {
      return { error: "Title, username, and password are required" };
    }
    if (typeof username !== "string" || typeof password !== "string") {
      return { error: "Invalid Data" };
    }
    if (username.length > 100 || password.length > 100) {
      return { error: "Title or username or password is too long" };
    }
    return {
      changes: { title, username, password: encryptSecret(password) },
    };
  }

  return { changes: { title } }; // images, docs
}

/* ---------- Edit ---------- */
routerdata.post("/update", async (req, res) => {
  const email = req.session?.email;
  if (!email)
    return res.status(401).json({ success: false, message: "Login required" });

  const { type, id } = req.body;
  const validType = Object.prototype.hasOwnProperty.call(TABLES, type);

  if (
    !validType ||
    id === undefined ||
    id === null ||
    (typeof id !== "string" && typeof id !== "number")
  ) {
    return res.status(400).json({ success: false, message: "Invalid request" });
  }

  try {
    const { changes, error: inputError } = buildChanges(type, req.body);
    if (inputError) {
      return res.status(400).json({ success: false, message: inputError });
    }

    const auth = await authorizeRecord(req, type, id);
    if (auth.message) {
      return res
        .status(auth.status)
        .json({ success: false, message: auth.message });
    }
    const { row } = auth;

    const { data, error } = await supabase
      .schema("cloud")
      .from(TABLES[type])
      .update(changes)
      .eq("id", id)
      .eq("email", row.email)
      .select("id");

    if (error) {
      console.error(error);
      return res
        .status(500)
        .json({ success: false, message: "Could not update" });
    }
    if (!data?.length) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    await Promise.all([
      clearUserDashboardCache(row.email),
      clearPublicDashboardCache(),
    ]);

    res.json({ success: true, message: "Updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Could not update" });
  }
});

/* ---------- Delete ---------- */
routerdata.post("/delete", async (req, res) => {
  const email = req.session?.email;
  if (!email)
    return res.status(401).json({ success: false, message: "Login required" });

  const { type, id } = req.body;
  const validType = Object.prototype.hasOwnProperty.call(TABLES, type);

  if (
    !validType ||
    id === undefined ||
    id === null ||
    (typeof id !== "string" && typeof id !== "number")
  ) {
    return res.status(400).json({ success: false, message: "Invalid request" });
  }

  try {
    const auth = await authorizeRecord(req, type, id);
    if (auth.message) {
      return res
        .status(auth.status)
        .json({ success: false, message: auth.message });
    }
    const { row } = auth;

    const { data, error } = await supabase
      .schema("cloud")
      .from(TABLES[type])
      .delete()
      .eq("id", id)
      .eq("email", row.email)
      .select("id");

    if (error) {
      console.error(error);
      return res
        .status(500)
        .json({ success: false, message: "Could not delete" });
    }
    if (!data?.length) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    await Promise.all([
      clearUserDashboardCache(row.email),
      clearPublicDashboardCache(),
    ]);

    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Could not delete" });
  }
});

/* ---------- Toggle visibility (owner only) ---------- */
routerdata.post("/visibility", async (req, res) => {
  const email = req.session?.email;
  if (!email)
    return res.status(401).json({ success: false, message: "Login required" });

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

  // Credentials are always private and the table has no is_public column,
  // so visibility can't be changed for them at all.
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
