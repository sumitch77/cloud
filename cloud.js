
const express = require('express');
const path = require('path');
const app = express();
const dotenv = require('dotenv');

const { router } = require('./routes/index');
const { router2 } = require('./routes/auth');
const { router4 } = require('./utils/oauth');
const { router8 } = require('./routes/forgot');
const { routerdata } = require('./routes/data');


const multer = require('multer');
const cors = require('cors');
const passport = require('passport');
const { User } = require('./routes/auth');

const {supabase} = require('./utils/supabase');

const session = require('express-session');
const connectPgSimple  = require('connect-pg-simple');
const pg  = require('pg');
const PgSession = connectPgSimple(session);


dotenv.config();
const allowedOrigins = [process.env.ALLOWED, process.env.THIRDALLOWED, process.env.FOURTHALLOWED];
app.use(cors({
   origin: function (origin, callback) {
        
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
          callback(null, false);
        }
    }
}));

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);
app.use(express.json());

const isProduction = process.env.NODE_ENV === 'production';

const pool = new pg.Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

app.use(
  session({
    store: new PgSession({
      pool: pool,
      tableName: 'session',
    }),
    secret: process.env.SESSION,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 10 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    },
  })
);



// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

// 4. Fetch user from Supabase on subsequent requests
passport.deserializeUser(async (id, done) => {
  const { data: user, error } = await supabase
    .from('allusers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  done(error, user);
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/uploads', express.static('uploads'));



app.use(router);
app.use(router2);
app.use(router4);
app.use(router8);
app.use(routerdata);


app.use((req, res, next) => {
   return res.status(404).render('error', {
  errorType: 'Not Found',
  errorCode: 404,
  errorMessage: "The page you're looking for doesn't exist."
});
});

 const port = 3069;
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });  

module.exports = { session};

