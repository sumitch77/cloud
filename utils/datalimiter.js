const express = require('express'); 
const { check , validationResult} = require('express-validator');
const { link } = require('fs');
let rateLimit = require('express-rate-limit');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const ipaddr = require('ipaddr.js');
const { ipKeyGenerator } = require('express-rate-limit');


const generalUploadLimiter = rateLimit({
    windowMs: 5 * 1000,
    limit: 1,

    skip: (req) =>
        req.session?.email === 'sumitchaudhary282006@gmail.com',

    keyGenerator: (req) =>
        req.session.email,

    standardHeaders: 'draft-8',
    legacyHeaders: false,

    message: {
        success: false,
        message: 'Request processing , wait'
    }
});

const imageUploadLimiter = rateLimit({
    windowMs: 24 *60* 60 * 1000,
    limit: 5,

    skip: (req) =>
        req.session?.email === 'sumitchaudhary282006@gmail.com',

    keyGenerator: (req) =>
        req.session.email,

    standardHeaders: 'draft-8',
    legacyHeaders: false,

    message: {
        success: false,
        message: 'your limit for today is full. Try again after 24 Hours.'
    }
});

const docUploadLimiter = rateLimit({
    windowMs: 24 *60* 60 * 1000,
    limit: 5,

    skip: (req) =>
        req.session?.email === 'sumitchaudhary282006@gmail.com',

    keyGenerator: (req) =>
        req.session.email,

    standardHeaders: 'draft-8',
    legacyHeaders: false,

    message: {
        success: false,
        message: 'your limit for today is full. Try again after 24 Hours.'
    }
});

const credentialUploadLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 20,

    skip: (req) =>
        req.session?.email === 'sumitchaudhary282006@gmail.com',

    keyGenerator: (req) =>
        req.session.email,

    standardHeaders: 'draft-8',
    legacyHeaders: false,

    message: {
        success: false,
        message: 'your limit is full. Try again after 5 minutes.'
    }
});


const textUploadLimiter = rateLimit({
    windowMs: 2 * 60 * 1000,
    limit: 40,

    skip: (req) =>
        req.session?.email === 'sumitchaudhary282006@gmail.com',

    keyGenerator: (req) =>
        ipKeyGenerator(req.ip),

    standardHeaders: 'draft-8',
    legacyHeaders: false,

    message: {
        success: false,
        message: 'Your limit is full. Try again after 2 minutes.'
    }
});

module.exports = {imageUploadLimiter , docUploadLimiter , credentialUploadLimiter , textUploadLimiter , generalUploadLimiter}