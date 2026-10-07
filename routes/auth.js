const express = require('express'); 
const path = require('path');
const router2 = express.Router();
const dotenv = require('dotenv');
dotenv.config();
const {Resend} = require('resend');
const resendClient = new Resend(process.env.TOKEN);
const { check } = require('express-validator');
const { EmailLimiter , TimeLimiter ,validate,} = require('../utils/ratelimit');
const {upload, cloudinary} = require('../utils/ratelimit');
const validate2 = require('deep-email-validator');
const { type } = require('os');
const {supabase } = require('../utils/supabase');
const {login} = require('../utils/helper');
const {fingerprintLimiter , emailLimiter , generalLimiter , emailLimiter2 , loginLimiter} = require('../utils/signuplimiter');

const crypto = require('crypto');


router2.get('/logout',  TimeLimiter,(req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'An error occurred during logout', error: err.message });
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});


router2.get('/login' , generalLimiter, login ,(req, res) => {

  res.sendFile(path.join(__dirname, '../views/login.html'));
});
router2.get('/signup' ,generalLimiter , login ,(req, res) => {

  res.sendFile(path.join(__dirname, '../views/signup.html'));
});

router2.post('/login',login, fingerprintLimiter, loginLimiter, async (req, res) => {
  try {
    let { username, password } = req.body;
        if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    username = String(username || '').trim();
    password = String(password || '').trim();


const { data, error } = await supabase
  .schema('cloud')
  .from('user_info')
  .select('email, username, role')
  .eq('username', username)
  .eq('password', password)
  .maybeSingle();

      if(data){
        const token = crypto.randomBytes(32).toString("hex");
        req.session.userId = token;
    req.session.email = data.email;
    req.session.role = data.role;
    req.session.username = data.username;
          return res.json({
    success: true,
    message: `Login successful`
  });
      }

    if(error){
  return res.json({
    success: false,
    message: `Invalid username or password`
  });
    }

  } catch (err) {
    console.error('Login error:', err);

    return res.status(500).json({
      success: false,
      message: 'Server error occurred during login'
    });
  }
});


    

router2.post('/signup',  login , fingerprintLimiter, emailLimiter, emailLimiter2,
  [    check('email').notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
    check('password').notEmpty().withMessage('Password is required')
    .isLength({ min: 6 , max:20 }).withMessage('Password must be between 6 and 20 characters long'),
    check('username').notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 20 }).withMessage('Name must be between 2 and 20 characters long'),
      
    
   ],
  validate,
  async (req, res, next) => {

  let { email , username , password} = req.body;
  email = email.toLowerCase().trim();
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

const token = crypto.randomBytes(32).toString("hex");
const tokenHash = crypto
  .createHash("sha256")
  .update(token)
  .digest("hex");

  const { data, error } = await supabase
  .schema('cloud')
  .from('email_verify')
  .insert({
    token: tokenHash,
    email: email
  });

  if(error){
    console.error('Supabase insert error:', error);
   return res.status(500).json({ success: false, message: 'Signup is currently not working', error: error.message });
  }
  
  try {
  const loginLink = `https://sumit7.website/linklogin?token=${token}`;

  await resendClient.emails.send({
    from: 'Sumit <Sumit@sumit7.website>',
    to: email,
    subject: 'Sign in to Cloud',

    html: `
      <!DOCTYPE html>
      <html>
        <body style="
          margin: 0;
          padding: 0;
          background: #f5f7fb;
          font-family: Arial, Helvetica, sans-serif;
          color: #171717;
        ">
          <div style="
            max-width: 520px;
            margin: 40px auto;
            padding: 0 20px;
          ">

            <div style="
              background: #ffffff;
              border-radius: 16px;
              padding: 40px 35px;
              text-align: center;
              border: 1px solid #e5e7eb;
            ">

              <div style="
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 28px;
              ">
                QuizNest
              </div>

              <h1 style="
                margin: 0 0 12px;
                font-size: 24px;
                color: #111827;
              ">
                Sign in to Cloud
              </h1>

              <p style="
                margin: 0 0 28px;
                color: #6b7280;
                font-size: 15px;
                line-height: 1.6;
              ">
                Click the button below to securely sign in to your account.
                No password or verification code required.
              </p>

              <a href="${loginLink}" style="
                display: inline-block;
                background: #7c3aed;
                color: #ffffff;
                text-decoration: none;
                font-size: 16px;
                font-weight: 600;
                padding: 14px 30px;
                border-radius: 10px;
              ">
                Sign in to Cloud
              </a>

              <p style="
                margin: 28px 0 0;
                color: #9ca3af;
                font-size: 13px;
                line-height: 1.5;
              ">
                This login link will expire in 10 minutes and can only be
                used once.
              </p>

              <div style="
                margin-top: 25px;
                padding-top: 20px;
                border-top: 1px solid #eeeeee;
                color: #9ca3af;
                font-size: 12px;
              ">
                If you didn't request this email, you can safely ignore it.
              </div>

            </div>

            <p style="
              text-align: center;
              color: #9ca3af;
              font-size: 12px;
              margin-top: 20px;
            ">
              © 2026 Cloud
            </p>

          </div>
        </body>
      </html>
    `,

    text: `
Sign in to Cloud

Click the link below to sign in:
${loginLink}

This link expires in 10 minutes and can only be used once.

If you didn't request this email, you can safely ignore it.
    `
  });

  console.log(` login link sent to ${email}`);

  const { data: user, error: userError } = await supabase
  .schema('cloud')
  .from('user_info')
  .insert({
    email: email,
    username: username,
    password: password,
    role:'notverified',
  });
  if(userError){
    console.error('Supabase user insert error:', userError);
   return res.status(500).json({ success: false, message: 'Signup is currently not working', error: userError.message });
  }
  return res.json({
    success: true,
    message: `Login link sent to ${email}`
  });

} catch (error) {
  console.log('Email error:', error);

 return res.status(500).json({
    success: false,
    message: 'Failed to send email',
    error: error.message
  });
  }

});


router2.get("/linklogin", generalLimiter, login, async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send("Invalid login link.");
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const { data, error } = await supabase
    .schema('cloud')
      .from("email_verify")
      .select("email, expires_at")
      .eq("token", tokenHash)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("Token lookup error:", error);
      return res.status(500).send("Something went wrong.");
    }

    if (!data) {
      return res.status(401).send("This login link is invalid or has expired.");
    }
   
    const { data: user, error: userError } = await supabase
    .schema('cloud')
      .from("user_info")
      .update({ role: "user"})
      .eq("email", data.email)
      .select()
      .maybeSingle();

      const { error: updateError } = await supabase
      .schema('cloud')
      .from("email_verify")
      .update({ used: true })
      .eq("token", tokenHash);

if (userError || updateError) {
      console.error("User update error:", userError || updateError);
      return res.status(500).send("Failed to contact with database.");
    }
    req.session.userId = token;
    req.session.email = data.email;
    req.session.role = "user";
    req.session.username = user.username;

    res.redirect("/");

  } catch (error) {
    console.error("email login error:", error);
    res.status(500).send("Login failed.");
  }
});



module.exports = {
    router2, 
    
};