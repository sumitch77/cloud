const express = require("express");
const path = require("path");
const router5 = express.Router();
const dotenv = require("dotenv");
dotenv.config();
const dns = require("dns");
const crypto = require("crypto");
const { check } = require("express-validator");
const {supabase} = require('./supabase');
const {
  TimeLimiter,
  VaultLimiter,
  validate,
  docupload,
  cloudinary,
  shortTermLimiter,
} = require("./security");

function login(req , res , next){
  if(!req.session.userName){
    return res.redirect('/login');
  }
  next();

}

router5.get("/manualupload",login, TimeLimiter, async (req, res) => {
  
    return res.sendFile(path.join(__dirname, "../views/manualupload.html"));
    
  });

router5.post("/genuuid" ,login ,TimeLimiter, async(req,res)=>{
const uuid = crypto.randomUUID();
const {data , error} = await supabase.from('quiz_info').insert([{
  quiz_uuid:uuid,
  created_by:req.session.userEmail
}]).select();
    if (error) {
            console.log(error);

        return res.status(500).json({ success: false, message: 'An error occurred during signup', error: error.message });
      
    }
if (data) {
  return res.status(200).json({success:true ,uuid:uuid, message:'ID generated'});
}

res.json({uuid:uuid});
});

router5.post("/quiz/question", login ,shortTermLimiter,

  [
      check('uuid')
      .notEmpty().withMessage('Something went wrong , Reload the Page')
      .isLength({ min: 10 , max:50 }).withMessage('False Request (Scam)'),
    check('question')
      .notEmpty().withMessage('Question is required')
      .isLength({ min: 6 , max:300 }).withMessage('Password must be between 6 and 300 characters long'),
      check('option_a')
      .notEmpty().withMessage('options are required')
      .isLength({ min: 6 , max:200 }).withMessage('option value must be between 6 and 200 characters long'),
      check('option_b')
      .notEmpty().withMessage('options are required')
      .isLength({ min: 6 , max:200 }).withMessage('option value must be between 6 and 200 characters long'),
      check('option_c')
      .notEmpty().withMessage('options are required')
      .isLength({ min: 6 , max:200 }).withMessage('option value must be between 6 and 200 characters long'),
     check('option_d')
      .notEmpty().withMessage('options are required')
      .isLength({ min: 6 , max:200 }).withMessage('option value must be between 6 and 200 characters long'),
        check('correct')
      .notEmpty().withMessage('Mark the correct asnwer!')
      .isLength({ min: 1 , max:50 }).withMessage('correct answer must be between 1 and 50 characters long'),
   

  ],
    validate,

   async(req,res)=>{
const {
    question,
    option_a,
    option_b,
    option_c,
    option_d,
    correct,
    uuid
} = req.body;

  const {data , error } = await supabase.from('question').insert([{
    question:question,
    option_a:option_a,
    option_b:option_b,
    option_c:option_c,
    option_d:option_d,
    user_email: "test",
    quiz_id:uuid,
    correct:correct
  }
  ]).select();
    if (error) {
            console.log(error);

        return res.status(500).json({ success: false, message: 'An error occurred during adding question', error: error.message });
      
    }
if (data) {
  return res.status(200).json({success:true , message:'Question saved' , quesid:data[0].id});
}

});


router5.post("/edit", login , shortTermLimiter, 
    [
      check('uuid')
      .notEmpty().withMessage('Something went wrong , Reload the Page')
      .isLength({ min: 10 , max:50 }).withMessage('False Request (Scam)'),
    check('question')
      .notEmpty().withMessage('Question is required')
      .isLength({ min: 6 , max:300 }).withMessage('Password must be between 6 and 300 characters long'),
      check('option_a')
      .notEmpty().withMessage('options are required')
      .isLength({ min: 6 , max:200 }).withMessage('option value must be between 6 and 200 characters long'),
      check('option_b')
      .notEmpty().withMessage('options are required')
      .isLength({ min: 6 , max:200 }).withMessage('option value must be between 6 and 200 characters long'),
      check('option_c')
      .notEmpty().withMessage('options are required')
      .isLength({ min: 6 , max:200 }).withMessage('option value must be between 6 and 200 characters long'),
     check('option_d')
      .notEmpty().withMessage('options are required')
      .isLength({ min: 6 , max:200 }).withMessage('option value must be between 6 and 200 characters long'),
        check('correct')
      .notEmpty().withMessage('Mark the correct asnwer!')
      .isLength({ min: 1 , max:50 }).withMessage('correct answer must be between 1 and 50 characters long'),
   

  ],
    validate,
  async(req,res)=>{
const {
    question,
    option_a,
    option_b,
    option_c,
    option_d,
    correct,
    quesid
} = req.body;
const { data, error } = await supabase
  .from('question')
  .update({ 
    question:question,
    option_a:option_a,
    option_b:option_b,
    option_c:option_c,
    option_d : option_d,
    correct:correct
  })
  .eq('id', quesid) 
  .select()       
  .single();            

if (error) {
  console.error('Update failed:', error);
  return res.status(500).json({ 
    success: false, 
    error: error.message 
  });
}

return res.status(200).json({
  success: true,
  message: 'Record updated successfully',
});
});

async function check2(req,res,next){
const {quesid}= req.body;
if(!quesid){
  return res.json({success:'half'})
}
next();
}

router5.post('/delques' ,login,check2, shortTermLimiter,

    [
      check('uuid')
      .notEmpty().withMessage('Something went wrong , Reload the Page')
      .isLength({ min: 10 , max:50 }).withMessage('False Request (Scam)'),

  ],
    validate,
  
  TimeLimiter,async(req,res)=>{
  const {quesid} = req.body;
  const { data, error } = await supabase
  .from('question')
  .delete()
  .eq('id', quesid)
  .select();      

if (error) {
  console.error('Delete failed:', error);
  return res.status(500).json({ 
    success: false, 
    error: error.message 
  });
}

return res.status(200).json({
  success: true,
  message: 'Record deleted successfully',
});

});

router5.get('/quizdata' , login , TimeLimiter,async(req,res,next)=>{
  const {data,error} = await supabase.from('quiz_info').select('*')
  .eq('created_by', req.session.userEmail);
  if(error){
    return res.status(500).json({success:false , message:'Internal Error'});
  }
  return res.json({data:data});

});

router5.post('/quizsubmit' ,login , TimeLimiter,
    [
      check('uuid')
      .notEmpty().withMessage('Something went wrong , Reload the Page')
      .isLength({ min: 10 , max:50 }).withMessage('False Request (Scam)'),
          check('title')
      .notEmpty().withMessage('Enter Title for Quiz')
      .isLength({ min: 1 , max:50 }).withMessage('Title must be between 1 and 50 characters long'),
    check('question')
      .notEmpty().withMessage('Question is required')
      .isLength({ min: 6 , max:300 }).withMessage('Password must be between 6 and 300 characters long'),
      check('option_a')
      .notEmpty().withMessage('options are required')
      .isLength({ min: 6 , max:200 }).withMessage('option value must be between 6 and 200 characters long'),
      check('option_b')
      .notEmpty().withMessage('options are required')
      .isLength({ min: 6 , max:200 }).withMessage('option value must be between 6 and 200 characters long'),
      check('option_c')
      .notEmpty().withMessage('options are required')
      .isLength({ min: 6 , max:200 }).withMessage('option value must be between 6 and 200 characters long'),
     check('option_d')
      .notEmpty().withMessage('options are required')
      .isLength({ min: 6 , max:200 }).withMessage('option value must be between 6 and 200 characters long'),
        check('correct')
      .notEmpty().withMessage('Mark the correct asnwer!')
      .isLength({ min: 1 , max:50 }).withMessage('correct answer must be between 1 and 50 characters long'),
   

  ],
    validate,
  async(req,res)=>{
  const {
    question,
    option_a,
    option_b,
    option_c,
    option_d,
    correct,
    total,
    uuid,
  title
} = req.body;

  const {data:data2 , error:error2 } = await supabase.from('quiz_info').update([{
 title:title,
 draft:false,
 total:total
  }
  ]).eq(quiz_uuid,uuid).select();
    if (error2) {
            console.log(error2);

        return res.status(500).json({ success: false, message: 'An error occurred during submit', error: error2.message });
      
    }
if (data2) {
  return res.status(200).json({success:true , message:'Question saved' , quesid:data2[0].id});

}

  const {data , error } = await supabase.from('question').insert([{
    question:question,
    option_a:option_a,
    option_b:option_b,
    option_c:option_c,
    option_d:option_d,
    user_email: "test",
    quiz_id:uuid,
    correct:correct
  }
  ]).select();
    if (error) {
            console.log(error);

        return res.status(500).json({ success: false, message: 'An error occurred during submit', error: error.message });
      
    }
if (data) {
  return res.status(200).json({success:true , message:'Question saved' , quesid:data[0].id});

}

});

module.exports = {router5};