const express = require("express");
const path = require("path");
const router = express.Router();
const dotenv = require("dotenv");
dotenv.config();
const dns = require("dns");
const crypto = require("crypto");
const { check } = require("express-validator");
const {
  TimeLimiter,
  VaultLimiter,
  validate,
  docupload,
  cloudinary,
} = require("../utils/ratelimit");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const { createProxyMiddleware } = require("http-proxy-middleware");
const { supabase } = require("../utils/supabase");

router.get("/", async (req, res) => {
  return res.sendFile(path.join(__dirname, "../views/dashboard.html"));
});

router.get("/alltime", async (req, res) => {
  return res.status(200).json({ success: true });
});

router.get("/policy", async (req, res) => {
  return res.sendFile(path.join(__dirname, "../public/policy.html"));
});

router.get("/terms", async (req, res) => {
  return res.sendFile(path.join(__dirname, "../public/terms.html"));
});

module.exports = {
  router,
};
