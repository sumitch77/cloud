const express = require('express'); 
const path = require('path');
const routerdata = express.Router();
const dotenv = require('dotenv');
dotenv.config();
const {Resend} = require('resend');
const resendClient = new Resend(process.env.TOKEN);
const { check } = require('express-validator');
const { EmailLimiter , TimeLimiter ,validate, upload , docupload , uploadFile , cloudinary} = require('../utils/ratelimit');
const {imageUploadLimiter , docUploadLimiter , credentialUploadLimiter , textUploadLimiter , generalUploadLimiter} = require('../utils/datalimiter');
const { type } = require('os');
const {supabase } = require('../utils/supabase');
const {login, loginother} = require('../utils/helper');
const multer = require('multer');
const crypto = require('crypto');
const { log } = require('console');


routerdata.post('/upload/text' , textUploadLimiter, async (req, res) => {
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

routerdata.post('/upload/credentials',loginother ,generalUploadLimiter, credentialUploadLimiter , async (req, res) => {
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

//add counter for multer
routerdata.post('/upload/image',loginother,generalUploadLimiter, imageUploadLimiter , upload.single('file'), async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            message: 'Login to upload image'
        });
    }

    const { title } = req.body;
    const file = req.file;

    if (!title || !file) {
        return res.status(400).json({
            success: false,
            message: 'Title and image are required'
        });
    }

    if (typeof title !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Invalid data'
        });
    }

    if (title.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Title is too long'
        });
    }
    if(file.size>5*1024*1024){
        return res.status(400).json({
            success: false,
            message: 'File size should be less than 5mb'
        });
    }

    try {
        const result = await uploadFile(file);

        const { error } = await supabase
            .schema('cloud')
            .from('upload_images')
            .insert({
                email: req.session.email || '',
                title,
                url: result.secure_url
            });

        if (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Image uploaded successfully'
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Image upload failed'
        });
    }
});

routerdata.post('/upload/doc',loginother,generalUploadLimiter, docUploadLimiter, docupload.single('file'), async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            message: 'Login to upload Doc'
        });
    }

    const { title } = req.body;
    const file = req.file;

    if (!title || !file) {
        return res.status(400).json({
            success: false,
            message: 'Title and image are required'
        });
    }
      if(file.size>5*1024*1024){
        return res.status(400).json({
            success: false,
            message: 'File size should be less than 5mb'
        });
    }

    if (typeof title !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Invalid data'
        });
    }

    if (title.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Title is too long'
        });
    }

    try {
        const result = await uploadFile(file);

        const { error } = await supabase
            .schema('cloud')
            .from('upload_docs')
            .insert({
                email: req.session.email || '',
                title,
                url: result.secure_url
            });

        if (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Doc uploaded successfully'
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Doc upload failed'
        });
    }
});



routerdata.get('/dashboard/data', async (req, res) => {

  const {page , type} = req.query;
  if(!page || !type){
   return res.status(404).render('error', {
  errorType: 'Not Found',
  errorCode: 404,
  errorMessage: "The page you're looking for doesn't exist."
});
  }
  if(isNaN(page ) || page < 1){
  return res.status(404).render('error', {
  errorType: 'Not Found',
  errorCode: 404,
  errorMessage: "Invalid Request"
});  }
  if(!type === 'public'){
   return res.status(404).render('error', {
  errorType: 'Not Found',
  errorCode: 404,
  errorMessage: "Invalid Request"
});
  }
  try {
 const { data, error } = await supabase
    .schema('cloud')
    .rpc('get_all_public_uploads', { page_num: page });


    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Unable to fetch data',
        error: error.message
      });
    }
   
          const finaldata = {
      login : req.session.userId ? true : false,
      username : req.session.userName || '',
        success: true,
     data: data || [],
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

  if(!req.session.userId){
    return res.status(401).json({ success: false, message: 'Login to view data' });
  }
  if(!req.session.email){
app.use((req, res, next) => {
   return res.status(404).render('error', {
  errorType: 'Not Found',
  errorCode: 404,
  errorMessage: "There is some error with your account , Try logout and login again.contact support for further problems"
});
});  }
  const {page , type} = req.query;
    if(!page || !type){
    return res.status(400).json({ success: false, message: 'Malicious Request' });
  }
  if(isNaN(page) || page < 1){
    return res.status(400).json({ success: false, message: 'Invalid request type' });
  }

  if(page >10){
        return res.status(400).json({
            success: false,
            message: 'Page number too high'
        });
    }
  if(!type || !['text', 'credentials', 'images', 'docs', 'all'].includes(type)){
        return res.status(400).json({
            success: false,
            message: 'Invalid request type'
        });
    }

  try { 
      const { data, error } = await supabase
      .schema('cloud')
      .rpc('get_user_uploads', {
        user_email: req.session.email,
        page_num: page,
        filter_type: type
      });

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Unable to fetch text data',
          error: error.message
        });
      }

    const finaldata = {
      login : req.session.userId ? true : false,
      username : req.session.userName || '',
        success: true,
    data : data 
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