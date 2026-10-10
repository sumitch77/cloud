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
      res.sendFile(path.join(__dirname, '../views/forgotlink.html'));
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
          console.error('Database error:', error);
          return res.status(500).json({"success": false, "message": "Database error"});
        }
       if (!data) {
  return res.json({ success: true, message: "If that email exists, a reset link has been sent." });
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
                Cloud
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
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invalid Link</title>
      <link rel="stylesheet" href="/output.css">
      </head>

      <body class="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
        <div class="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
          <div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M6 18 18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 class="text-xl font-semibold">Invalid reset link</h1>
          <p class="mt-2 text-sm text-neutral-400">
            This password reset link is missing or invalid.
          </p>
        </div>
      </body>
      </html>
    `);
  }

  const { data, error } = await supabase
    .schema('cloud')
    .from('reset_pass')
    .select('email, token, created_at, expires_at, active')
    .eq('token', token)
    .eq('active', true)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
      <link rel="stylesheet" href="/output.css">
      </head>

      <body class="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
        <div class="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
          <h1 class="text-xl font-semibold text-red-400">
            Something went wrong
          </h1>

          <p class="mt-2 text-sm text-neutral-400">
            We couldn't verify your reset link. Please try again later.
          </p>
        </div>
      </body>
      </html>
    `);
  }

  if (!data) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Link Expired</title>
      <link rel="stylesheet" href="/output.css">
      </head>

      <body class="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
        <div class="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">

          <div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M6 18 18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 class="text-xl font-semibold">
            Link expired
          </h1>

          <p class="mt-2 text-sm text-neutral-400">
            This password reset link is invalid or has expired.
          </p>

        </div>
      </body>
      </html>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">

      <title>Verifying reset link</title>

      <link rel="stylesheet" href="/output.css">
    </head>

    <body class="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">

      <div class="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">

        <div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">

          <div class="h-8 w-8 animate-spin rounded-full border-4 border-neutral-700 border-t-blue-500"></div>

        </div>

        <h1 class="text-xl font-semibold">
          Verifying your reset link
        </h1>

        <p class="mt-2 text-sm text-neutral-400">
          Please wait while we verify your request.
        </p>

      </div>

      <script>
        setTimeout(() => {
          window.location.href =
            '/resetconfirmpassword?token=${encodeURIComponent(token)}';
        }, 1200);
      </script>

    </body>
    </html>
  `);
});

router8.get('/resetconfirmpassword', async (req, res) => {
  const { token } = req.query;

   if (!token) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invalid Link</title>
      <link rel="stylesheet" href="/output.css">
      </head>

      <body class="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
        <div class="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
          <div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M6 18 18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 class="text-xl font-semibold">Invalid reset link</h1>
          <p class="mt-2 text-sm text-neutral-400">
            This password reset link is missing or invalid.
          </p>
        </div>
      </body>
      </html>
    `);
  }

   const { data: resetData, error: resetError } = await supabase
      .schema('cloud')
      .from('reset_pass')
      .select('email')
      .eq('token', token)
      .eq('active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (resetError) {
      console.error('Reset token lookup error:', resetError);

      return res.status(500).json({
        success: false,
        message: 'Something went wrong'
      });
    }

    if (!resetData) {
   return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Link Expired</title>
      <link rel="stylesheet" href="/output.css">
      </head>

      <body class="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
        <div class="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">

          <div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M6 18 18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 class="text-xl font-semibold">
            Link expired
          </h1>

          <p class="mt-2 text-sm text-neutral-400">
            This password reset link is invalid or has expired.
          </p>

        </div>
      </body>
      </html>
      `);
    }
    res.sendFile(path.join(__dirname, '../views/forgot.html'));
});


router8.post('/resetpassword', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all fields'
      });
    }
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    if (password.length < 6 || password.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Password should be between 6 and 100 characters'
      });
    }

    // Verify reset token again
    const { data: resetData, error: resetError } = await supabase
      .schema('cloud')
      .from('reset_pass')
      .select('email')
      .eq('token', token)
      .eq('active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (resetError) {
      console.error('Reset token lookup error:', resetError);

      return res.status(500).json({
        success: false,
        message: 'Something went wrong'
      });
    }

    if (!resetData) {
      return res.status(400).json({
        success: false,
        message: 'Reset link is invalid or expired'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password
    const { error: userError } = await supabase
      .schema('cloud')
      .from('user_info')
      .update({
        password: hashedPassword
      })
      .eq('email', resetData.email)
      .maybeSingle();

    if (userError) {
      console.error('Password update error:', userError);

      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }

    // Invalidate reset token
    const { error: tokenError } = await supabase
      .schema('cloud')
      .from('reset_pass')
      .update({
        active: false
      })
      .eq('token', token);

    if (tokenError) {
      console.error('Token update error:', tokenError);

      return res.status(500).json({
        success: false,
        message: 'Password was changed, but failed to invalidate reset link'
      });
    }

    return res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);

    return res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
});

   module.exports = {router8};