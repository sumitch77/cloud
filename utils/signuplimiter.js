const express = require('express');
const rateLimit = require('express-rate-limit');
const { check , validationResult} = require('express-validator');
const { link } = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const ipaddr = require('ipaddr.js');
const { ipKeyGenerator } = require('express-rate-limit');

const tooMany = (msg) => (req, res) =>
     res.status(429).json({ error: msg });


// 2) Fingerprint limiter
const fingerprintLimiter = rateLimit({
  windowMs:  5 * 1000,
  limit: 1,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip);
    const email = req.body?.email || '';
    const fp = req.get('datap') || 'none';
    return crypto.createHash('sha256').update(`${ip}|${fp}|${email}`).digest('hex');
  },
  handler: tooMany('Your request is processing. Please wait a few seconds before clicking again.'),
});
const loginLimiter = rateLimit({
  windowMs:  30 * 1000,
  limit: 100,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip);
    const fp = req.get('datap') || 'none';
    return crypto.createHash('sha256').update(`${ip}|${fp}|`).digest('hex');
  },
  handler: tooMany('Your request is processing. Please wait a few seconds before clicking again.'),
});
function canonicalEmail(raw) {
  if (typeof raw !== 'string' || raw.length > 254) return null;

  const email = raw.normalize('NFKC').trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;

  let local = email.slice(0, at);
  let domain = email.slice(at + 1);

  local = local.split('+')[0];

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.replace(/\./g, '');
    domain = 'gmail.com';
  }

  if (!local) return null;   // nothing left after stripping
  return `${local}@${domain}`;
}

// 3) Email limiter: strictest, per account
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) =>
    canonicalEmail(req.body?.email) || ipKeyGenerator(req.ip),
  handler: tooMany('Too many attempts for this email'),
});

const emailLimiter2 = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip);
    const fp = req.get('datap') || 'none';
    return crypto.createHash('sha256').update(`${ip}|${fp}`).digest('hex');
  },
  handler: tooMany('Too many attempts for this email'),
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip);
    const fp = req.get('datap') || 'none';
    return crypto.createHash('sha256').update(`${ip}|${fp}`).digest('hex');
  },
  handler: tooMany('Too Many requests'),
});

const forgotlimitter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 2,
  keyGenerator: (req) => {
    const email = canonicalEmail(req.body?.email) || '';
    return crypto.createHash('sha256').update(`${email}`).digest('hex');
  },
  handler: tooMany('Invalid Email or Too Many requests'),
});

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function length(req, res, next) {
  const raw = req.body?.email;

  if (typeof raw !== 'string' || !raw) {
    return res.status(400).json({ success: false, message: 'Invalid Email' });
  }

  const email = raw.trim();

  if (email.length > 100) {
    return res.status(400).json({ success: false, message: 'Email is too long' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid Email' });
  }

  const canon = canonicalEmail(email);   
  if (!canon) {
    return res.status(400).json({ success: false, message: 'Invalid Email' });
  }

  next();
}

const forgotiplimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip);
    return crypto.createHash('sha256').update(`${ip}`).digest('hex');
  } ,
  handler: tooMany('Too Many requests from this IP'),
});

module.exports = {
  fingerprintLimiter,
  emailLimiter,
  emailLimiter2,
  generalLimiter,
  loginLimiter,
  canonicalEmail,
  forgotlimitter,
  length,
  forgotiplimiter
};