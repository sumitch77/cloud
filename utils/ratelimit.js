const express = require('express'); 
const { check , validationResult} = require('express-validator');
const { link } = require('fs');
let ratelimit = require('express-rate-limit');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const ipaddr = require('ipaddr.js');


cloudinary.config({
  cloud_name: process.env.CLOUDINNAME,
  api_key: process.env.CLOUDINAPI,
  api_secret: process.env.CLOUDINSEC,
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  
  if (allowed.includes(file.mimetype)) {
    cb(null, true); 
  } else {
    cb(new Error('Only images allowed'), false); 
  }
};

const storage = multer.memoryStorage();
const upload = multer({ storage,
    fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
 });


 const docstorage = multer.memoryStorage();
  const docupload = multer({ docstorage,
    limits: { fileSize: 20 * 1024 * 1024 },
  });




const shortTermLimiter = ratelimit({
    windowMs: 10 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      getClientIp(req).then(clientIp=>{

 return `${clientIp}:${req.path}`;
      });
   
},
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: "Please wait a few seconds before clicking again.",
        });
    }
});


async function getClientIp(req) {
    let clientIp = req.ip; // Or req.socket.remoteAddress

    if (ipaddr.isValid(clientIp)) {
        const parsedIp = ipaddr.parse(clientIp);
        
        // If it's an IPv4 address mapped inside IPv6, convert it to standard IPv4
        if (parsedIp.kind() === 'ipv6' && parsedIp.isIPv4MappedAddress()) {
            clientIp = parsedIp.toIPv4Address().toString();
        }
    }

    return clientIp;
}
const EmailLimiter = ratelimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      let normalizedEmail = 'anonymous'; 
    if (req.body && req.body.email) {
      const email = req.body.email.toLowerCase().trim();
      const [user, domain] = email.split('@');
      const cleanUser = domain === 'gmail.com' ? user.replace(/\./g, '') : user;
      normalizedEmail = `${cleanUser}@${domain}`;
    }
  getClientIp(req).then(clientIp => {
    const fingerprint = [
      normalizedEmail,
      clientIp,
      req.headers['user-agent'],
      req.headers['accept-language']
    ].join('###');
    req.session.emailfingerprint = fingerprint;
    return req.session.finalfingerprint;

  });
},
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: "Limit reached. Please wait 10 minutes before trying again.",
        });
    }
});


const TimeLimiter = ratelimit({
    windowMs: 3 * 1000,
    max: 2,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      getClientIp(req).then(clientIp=>{
        
 return `${clientIp}:${req.path}`;
      });
},
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: "Processing your request. Please wait a few seconds before trying again.",
        });
    }
});

const VaultLimiter = ratelimit({
    windowMs: 60 *60* 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
       return "overall_limit";
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: "Upload limit reached. Please wait 1 hour before trying again.",
        });
    }
});


const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const extractedError = errors.array()[0].msg;
  
  return res.status(400).json({
    success: false,
    message: extractedError,
  });
};

module.exports={
shortTermLimiter,
EmailLimiter,
TimeLimiter,
VaultLimiter,
validate,
upload,
cloudinary,
docupload,
};

