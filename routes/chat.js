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

routerchat.get("/chat", loginother, async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/chat.html"));
});
module.exports = { routerchat };
