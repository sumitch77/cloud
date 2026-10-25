const express = require("express");
const path = require("path");
const routerchat = express.Router();
const dotenv = require("dotenv");
dotenv.config();
const { Resend } = require("resend");
const resendClient = new Resend(process.env.TOKEN);
const { check } = require("express-validator");
const { upload, cloudinary } = require("../utils/ratelimit");
const { type } = require("os");
const { supabase } = require("../utils/supabase");
const { login, loginother } = require("../utils/helper");
const crypto = require("crypto");
const {
  chatReadLimiter,
  chatSearchLimiter,
  chatSendLimiter,
} = require("../utils/chatlimiter");

routerchat.get("/chat", loginother, async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/chat.html"));
});

/* ---------- Chat (QuickChat) ----------
 * Routes: POST /chatlist, /getchats, /sendchat, /searchusers
 * Tables (schema "cloud"):
 *   chat_messages   id, sender, receiver, message, created_at   (usernames, not emails)
 *   function        get_chat_users(me text)  ->  the usernames `me` has chatted with, newest first
 *   users table     your existing signup table. Change the 3 names below if yours differ.
 *
 * The username always comes from the login session (req.session.userName).
 * A `username` sent in the request body is ignored, so nobody can read or send as someone else.
 */
const USERS_SCHEMA = "cloud";
const USERS_TABLE = "user_info";
const USERS_NAME_COLUMN = "username";

const CHAT_MAX_MESSAGE = 1000;
const CHAT_MAX_USERNAME = 100;
const CHAT_MAX_SEARCH = 50;
const CHAT_HISTORY_LIMIT = 200; // newest messages loaded per conversation
const CHAT_SEARCH_LIMIT = 20;

// Simple per-user limit (in memory, resets on restart)
// function makeLimiter(max, windowMs) {
//   const hits = new Map();
//   return (key) => {
//     const now = Date.now();
//     if (hits.size > 5000) hits.clear();
//     const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
//     const limited = recent.length >= max;
//     if (!limited) recent.push(now);
//     hits.set(key, recent);
//     return limited;
//   };
// }
// const chatSendLimited = makeLimiter(30, 60 * 1000); // 30 messages / minute
// const chatReadLimited = makeLimiter(120, 60 * 1000); // the page polls every few seconds
// const chatSearchLimited = makeLimiter(30, 60 * 1000);

const CHAT_BUSY = {
  success: false,
  message: "Too many requests. Please slow down.",
};

// Returns the logged-in username, or answers with an error and returns null
function chatUser(req, res) {
  if (!req.session?.userId) {
    res.status(401).json({ success: false, message: "Login to use chat" });
    return null;
  }
  if (!req.session.userName) {
    res.status(403).json({
      success: false,
      message:
        "There is some error with your account. Try logout and login again, or contact support.",
    });
    return null;
  }
  return req.session.userName;
}

function validChatName(name) {
  return (
    typeof name === "string" &&
    name.trim().length > 0 &&
    name.length <= CHAT_MAX_USERNAME
  );
}

async function chatUserExists(name) {
  const { data, error } = await supabase
    .schema(USERS_SCHEMA)
    .from(USERS_TABLE)
    .select(USERS_NAME_COLUMN)
    .eq(USERS_NAME_COLUMN, name)
    .limit(1);

  if (error) throw error;
  return Boolean(data && data.length);
}

/* ---------- Chat: people I have chatted with ---------- */
routerchat.post("/chatlist", chatReadLimiter, async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  const me = chatUser(req, res);
  if (!me) return;

  try {
    const { data, error } = await supabase
      .schema("cloud")
      .rpc("get_chat_users", { me });

    if (error) throw error;

    const users = (data || [])
      .map((row) => (typeof row === "string" ? row : row && row.username))
      .filter((name) => typeof name === "string" && name && name !== me);

    res.json({ success: true, users });
  } catch (err) {
    console.error("chatlist failed:", err.message);
    res.status(500).json({ success: false, message: "Could not load chats" });
  }
});

/* ---------- Chat: messages between me and one other user ---------- */
routerchat.post("/getchats", chatReadLimiter, async (req, res) => {
  const me = chatUser(req, res);
  if (!me) return;

  const { chatwith } = req.body || {};
  if (!validChatName(chatwith) || chatwith === me) {
    return res.status(400).json({ success: false, message: "Invalid request" });
  }

  // two plain queries (me -> them, them -> me): no filter string is built from user input
  const side = (from, to) =>
    supabase
      .schema("cloud")
      .from("chat_messages")
      .select("id,sender,message,created_at")
      .eq("sender", from)
      .eq("receiver", to)
      .order("created_at", { ascending: false })
      .limit(CHAT_HISTORY_LIMIT);

  try {
    const [sent, received] = await Promise.all([
      side(me, chatwith),
      side(chatwith, me),
    ]);
    if (sent.error) throw sent.error;
    if (received.error) throw received.error;

    const data = [...(sent.data || []), ...(received.data || [])]
      .sort(
        (a, b) =>
          new Date(a.created_at) - new Date(b.created_at) || a.id - b.id,
      )
      .slice(-CHAT_HISTORY_LIMIT); // oldest first

    res.json({ success: true, data });
  } catch (err) {
    console.error("getchats failed:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Could not load messages" });
  }
});

/* ---------- Chat: send a message ---------- */
routerchat.post("/sendchat", chatSendLimiter, async (req, res) => {
  const me = chatUser(req, res);
  if (!me) return;

  const { chatwith, message } = req.body || {};

  if (!chatwith || !message) {
    return res
      .status(400)
      .json({ success: false, message: "Receiver and message are required" });
  }
  if (typeof chatwith !== "string" || typeof message !== "string") {
    return res.status(400).json({ success: false, message: "Invalid Data" });
  }

  const text = message.trim();
  if (!text) {
    return res
      .status(400)
      .json({ success: false, message: "Message can't be empty" });
  }
  if (text.length > CHAT_MAX_MESSAGE) {
    return res.status(400).json({
      success: false,
      message: `Message is too long (max ${CHAT_MAX_MESSAGE} characters)`,
    });
  }
  if (!validChatName(chatwith)) {
    return res.status(400).json({ success: false, message: "Invalid Data" });
  }

  try {
    if (!(await chatUserExists(chatwith))) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const { error } = await supabase
      .schema("cloud")
      .from("chat_messages")
      .insert({ sender: me, receiver: chatwith, message: text });

    if (error) throw error;

    res.json({ success: true, message: "Message sent" });
  } catch (err) {
    console.error("sendchat failed:", err.message);
    res.status(500).json({ success: false, message: "Could not send message" });
  }
});

/* ---------- Chat: find users to talk to ---------- */
routerchat.post("/searchusers", chatSearchLimiter, async (req, res) => {
  const me = chatUser(req, res);
  if (!me) return;

  const { query } = req.body || {};
  if (typeof query !== "string") {
    return res.status(400).json({ success: false, message: "Invalid request" });
  }

  const term = query.trim();
  if (!term || term.length > CHAT_MAX_SEARCH) {
    return res.status(400).json({
      success: false,
      message: `Search must be between 1 and ${CHAT_MAX_SEARCH} characters`,
    });
  }

  try {
    const { data, error } = await supabase
      .schema(USERS_SCHEMA)
      .from(USERS_TABLE)
      .select(USERS_NAME_COLUMN)
      .ilike(USERS_NAME_COLUMN, `%${escapeLike(term)}%`)
      .neq(USERS_NAME_COLUMN, me)
      .order(USERS_NAME_COLUMN, { ascending: true })
      .limit(CHAT_SEARCH_LIMIT);

    if (error) throw error;

    const users = (data || [])
      .map((row) => row[USERS_NAME_COLUMN])
      .filter((name) => typeof name === "string" && name);

    res.json({ success: true, users });
  } catch (err) {
    console.error("searchusers failed:", err.message);
    res.status(500).json({ success: false, message: "Could not search users" });
  }
});

module.exports = { routerchat };
