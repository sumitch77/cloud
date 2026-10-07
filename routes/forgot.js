const express = require('express'); 
const path = require('path');
const router8 = express.Router();
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
const { canonicalEmail , forgotlimitter , length , forgotiplimiter} = require('../utils/signuplimiter');

const crypto = require('crypto');

router8.get('/forgot', (req, res) => {
      res.sendFile(path.join(__dirname, '../views/forgot.html'));
    });


router8.post('/forgot',login ,forgotiplimiter , length,  forgotlimitter , async (req, res) => {

    let { email } = req.body;
    email = String(email || '').trim();
    email = canonicalEmail(email);
    if (!email) {
      return res.status(400).json({"success": false, "message": "Email is required"});
    }
    const { data, error } = await supabase
        .schema('cloud')
        .from('user_info')
        .select('email, username, role')
        .eq('email', email)
        .maybeSingle();

        if (error) {
          return res.status(500).json({"success": false, "message": "Database error", "error": error.message});
        }
        if (!data) {
          return res.status(404).json({"success": false, "message": "User not found"});
        }
        try {
            const token = crypto.randomBytes(32).toString('hex');
            const {data: tokenData, error: tokenError} = await supabase
                .schema('cloud')
                .from('reset_pass')
                .insert({ email, token })
                .single();
                if (tokenError) {
                    return res.status(500).json({"success": false, "message": "Database error", "error": tokenError.message});
                }
  const loginLink = `https://sumit7.website/resetpassword?token=${token}`;

  await resendClient.emails.send({
    from: 'Sumit <Sumit@sumit7.website>',
    to: email,
    subject: 'Reset Your Password',

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
                Reset Your Password
              </h1>

              <p style="
                margin: 0 0 28px;
                color: #6b7280;
                font-size: 15px;
                line-height: 1.6;
              ">
                Click the button below to securely reset your password.
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
                Reset Your Password
              </a>

              <p style="
                margin: 28px 0 0;
                color: #9ca3af;
                font-size: 13px;
                line-height: 1.5;
              ">
                This reset link will expire in 15 minutes and can only be
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
Reset Your Password

Click the link below to reset your password:
${loginLink}

This link expires in 15 minutes and can only be used once.

If you didn't request this email, you can safely ignore it.
    `
  });

  return res.json({"success": true, "message": "Reset password email sent successfully"});
        }
        catch (error) {
            return res.status(500).json({"success": false, "message": "Error sending email", "error": error.message});
        }

    });


    router8.get('/resetpassword', async (req, res) => {
      const { token } = req.query;
      if (!token) {
        return res.status(400).send('Invalid request');
      }
      const { data, error } = await supabase
          .schema('cloud')
          .from('reset_pass')
          .select('email, token, created_at , expires_at ,active')
          .eq('token', token)
          .eq('active', true)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

          if (error) {
            return res.status(500).send('Database error');
          }
          if (!data) {
            return res.status(400).send('Invalid or expired link');
          }
        });

          

module.exports = {router8};