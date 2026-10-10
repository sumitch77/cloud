const express = require('express'); 
const path = require('path');
const router4 = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const dotenv = require('dotenv');
dotenv.config();

const{ supabase} = require('./supabase');
const crypto = require('crypto');



router4.get('/auth/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

// Step 2: Google handles login, then sends the user back to this explicit callback URL.
router4.get('/auth/google/callback', 
    passport.authenticate('google', { 
        failureRedirect: '/login',
        session: true 
    }),
    (req, res) => {
      const userId = crypto.randomBytes(32).toString("hex");
        req.session.userName = req.user.username;
        req.session.userId = userId;
        req.session.role = req.user.role || 'user';
        req.session.email = req.user.email;
        

        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.redirect('/login');
            }
            res.redirect('/');
        });
    }
);
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || null;
        const name = profile.displayName;
        const photo = profile.photos?.[0]?.value || null;

        // 1. Query Supabase (matching table 'allusers' and column 'googleid')
        let { data: user, error } = await supabase
        .schema('cloud')
          .from('user_info')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (error) {
          console.error('Supabase lookup error:', error);
          return done(new Error(error.message), null);
        }

        // 2. Insert user if they don't exist
        if (!user) {
          const { data: newUser, error: insertError } = await supabase
          .schema('cloud')
            .from('user_info')
            .insert([
              {
                googleid: googleId,
                email: email,
                username: name,
                googlephoto: photo,
              },
            ])
            .select()
            .single();

          if (insertError) {
            console.error('Supabase insert error:', insertError);
            return done(new Error(insertError.message), null);
          }
          user = newUser;
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = {router4};