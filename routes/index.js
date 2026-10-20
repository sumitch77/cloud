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

router.post("/captcha", async (req, res) => {
  const { email, token } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Missing Email." });
  }
  if (!token) {
    return res
      .status(400)
      .json({ success: false, message: "Missing reCAPTCHA token." });
  }

  try {
    const googleVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.CAPTCHA}&response=${token}`;

    const response = await fetch(googleVerifyUrl, { method: "POST" });
    const data = await response.json();

    if (data.success && data.score >= 0.5 && data.action === "signup") {
      req.session.captcha = {
        valid: true,
        email,
        issuedAt: Date.now(),
      };
      return res.json({
        success: true,
        message: "Captcha verification successful!",
      });
    } else {
      req.session.captcha = null;
      return res.status(403).json({
        success: false,
        message: "Captcha verification failed , Please try again",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Not your fault ,Internal verification error.",
    });
  }
});

module.exports = {
  router,
};
