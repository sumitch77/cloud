const express = require("express");
const { check, validationResult } = require("express-validator");
const { link } = require("fs");
let rateLimit = require("express-rate-limit");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const crypto = require("crypto");
const ipaddr = require("ipaddr.js");
const { ipKeyGenerator } = require("express-rate-limit");

const chatSendLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,

  skip: (req) => req.session?.email === "sumitchaudhary282006@gmail.com",

  keyGenerator: (req) => req.session.email,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message: "You are sending too much messages , please wait",
  },
});

const chatReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,

  skip: (req) => req.session?.email === "sumitchaudhary282006@gmail.com",

  keyGenerator: (req) => req.session.email,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message: "You are Reading too much messages , please wait",
  },
});

const chatSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,

  skip: (req) => req.session?.email === "sumitchaudhary282006@gmail.com",

  keyGenerator: (req) => req.session.email,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message: "You are searching too much messages , please wait",
  },
});

module.exports = { chatReadLimiter, chatSearchLimiter, chatSendLimiter };
