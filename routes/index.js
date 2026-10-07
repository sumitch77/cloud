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
  // if(req.session.userId){
    return res.sendFile(path.join(__dirname, "../views/dashboard.html"));
  
  // } res.redirect('/login');
});

router.get("/dashboard", async (req, res) => {
res.render('dashboard', { page: 'dashboard' });
});

router.get("/trainees", async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/trainees.html"));
});
router.get("/trainers", async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/trainers.html"));
});
router.get("/trainerdashboard", async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/trainer/trainerdash.html"));
});

router.get("/courses", async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/courses.html"));
});

router.get("/providers", async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/tcenters.html"));
});

router.get("/employment", async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/employment.html"));
});

router.get("/analysis", async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/analysis.html"));
});

router.get("/reports", async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/reports.html"));
});

router.get("/settings", async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/settings.html"));
});

router.get("/centers/add", async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/an/provider.html"));
});
router.get("/trainees/add", async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/an/trainee.html"));
});
router.get("/trainers/add", async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/an/trainer.html"));
});
router.get("/courses/add", async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/an/course.html"));
});




router.get("/trainersdata", async (req, res) => {
  const { data: user, error } = await supabase
    .schema('sih')
    .from('trainers')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching trainers data:', error);
    return res.status(500).json({ success: false, message: 'An error occurred while fetching trainers data' });
  }
  return res.json({ success: true, data: user });

});

router.get("/reportsdata", async (req, res) => {
  const { data: user, error } = await supabase
    .schema('sih')
    .from('overview')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching reports data:', error);
    return res.status(500).json({ success: false, message: 'An error occurred while fetching reports data' });
  }
  return res.json({ success: true, data: user });

});

router.get("/coursesdata", async (req, res) => {
  const { data: user, error } = await supabase
  .schema('sih')
    .from('courses')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching courses data:', error);
    return res.status(500).json({ success: false, message: 'An error occurred while fetching courses data' });
  }
  return res.json({ success: true, data: user });

});



router.get("/centresdata", async (req, res) => {

  const { data: centres, error } = await supabase
    .schema('sih')
    .from('training_center1')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching centres data:', error);

    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching centres data'
    });
  }

  return res.json({
    success: true,
    data: centres
  });
});


// Trainees
router.get("/trackingdata", async (req, res) => {

  const { data: trainees, error } = await supabase
    .schema('sih')
    .from('trainees')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching trainees data:', error);

    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching trainees data'
    });
  }

  return res.json({
    success: true,
    data: trainees
  });
});


// Beneficiaries
router.get("/beneficiariesdata", async (req, res) => {

  const { data: beneficiaries, error } = await supabase
    .schema('sih')
    .from('trainees')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching beneficiaries data:', error);

    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching beneficiaries data'
    });
  }

  return res.json({
    success: true,
    data: beneficiaries
  });
});

router.get("/alltime", (req, res, next) => {
  return res.json("hello");
});

router.get("/Privacy-Policy", (req, res, next) => {
  res.sendFile(path.join(__dirname, "../public/privacy.html"));
});
router.get("/Terms-of-Use", (req, res, next) => {
  res.sendFile(path.join(__dirname, "../public/terms.html"));
});

router.post("/fingerprint", async (req, res) => {
  const { fingerprint } = req.body;
  // req.session.finalfingerprint = fingerprint;
  res.json({ success: true });
});

router.get("/check", async (req, res) => {
  if (req.session.userId) {
    return res.json({ login: true, userId: req.session.userId });
  }
  return res.json({ login: false });


});

router.get("/help", async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/help.html"));
});

router.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/dashboard.html"));

});

router.post("/captcha", async (req, res) => {
  const { email, token } = req.body;

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
    return res
      .status(500)
      .json({
        success: false,
        message: "Not your fault ,Internal verification error.",
      });
  }
});

module.exports = {
  router,
};
