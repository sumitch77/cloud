const express = require('express'); 
const path = require('path');
const routerdata = express.Router();
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

const crypto = require('crypto');
const { log } = require('console');


routerdata.post('/upload/text', async (req, res) => {
    const {title , content } = req.body;

    if (!title || !content) {
        return res.status(400).json({ success: false, message: 'Title and content are required' });
    }
    if (typeof title !== 'string' || typeof content !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid Data' });
    }
    if(title.length > 100 || content.length > 10000){
        return res.status(400).json({ success: false, message: 'Title or content is too long' });
    }
    const { data, error } = await supabase
        .schema('cloud')
        .from('upload_text')
        .insert({ email: req.session.email || 'without login' ,title, value :content });

        if (error) {
            return res.status(500).json({ success: false, message: 'Database error', error: error.message });
        }
        return res.status(200).json({ success: true, message: 'Text uploaded successfully' });
});

routerdata.post('/upload/credentials', async (req, res) => {
  if(!req.session.userId){
    return res.status(401).json({ success: false, message: 'Login to upload credentials' });
  }
    const {title , username, password } = req.body;

    if (!title || !username || !password) {
        return res.status(400).json({ success: false, message: 'Title, username, and password are required' });
    }
    if (typeof title !== 'string' || typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid Data' });
    }
    if(title.length > 100 || username.length > 100 || password.length>100){
        return res.status(400).json({ success: false, message: 'Title or username or password is too long' });
    }
    const { data, error } = await supabase
        .schema('cloud')
        .from('upload_credentials')
        .insert({ email: req.session.email || '' ,title, username, password });

        if (error) {
            return res.status(500).json({ success: false, message: 'Database error', error: error.message });
        }
        return res.status(200).json({ success: true, message: 'Credentials uploaded successfully' });
});


routerdata.get('/dashboard/data', async (req, res) => {

  try {
    const { data, error } = await supabase
    .schema('cloud')
      .from('upload_text')
      .select('title, value, created_at')
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Unable to fetch data',
        error: error.message
      });
    }

    const finaldata = {
      login : req.session.userId ? true : false,
        success: true,
      text: data,
      credentials: [],
      images: [],
      docs: []
    };

    res.json(finaldata);

  } catch (err) {
    res.status(500).json({
        success: false,
        message: 'Server Error',
      error: err.message
    });
  }


});

routerdata.get('/dashboard/data2', async (req, res) => {

  try { 

    const page = Math.max(parseInt(req.query.page) || 1, 1);

    if(isNaN(page) || page < 1){
        return res.status(400).json({
            success: false,
            message: 'Invalid page number'
        });
    }
    if(page >10){
        return res.status(400).json({
            success: false,
            message: 'Page number too high'
        });
    }
    const type = req.query.type;
    if(!type || !['text', 'credentials', 'images', 'docs', 'all'].includes(type)){
        return res.status(400).json({
            success: false,
            message: 'Invalid type'
        });
    }

    const limit = 12;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let text = [];
    let credentials = [];
    let images = [];
    let docs = [];


    // TEXT
    if (type === 'text' || type === 'all') {

      const { data, error } = await supabase
        .schema('cloud')
        .from('upload_text')
        .select('title, value, created_at')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Unable to fetch text data',
          error: error.message
        });
      }

      text = data || [];
    
    if(data.length === 0){
        return res.status(404).json({
            success: false,
            message: 'No data found'
        });
    }
}


    const finaldata = {
      success: true,
      text,
      credentials,
      images,
      docs
    };


    res.json(finaldata);


  } catch (err) {
console.error('Error fetching dashboard data:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    });

  }

});

module.exports = { routerdata };