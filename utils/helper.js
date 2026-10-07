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
} = require("./ratelimit");

function login(req , res , next){

  if(req.session.userId){
    return res.redirect('/');
  }
  next();

}

function loginother(req , res , next){
    if(!req.session.userId){
    return res.redirect('/login');
  }
  next();
}


module.exports = {login, loginother};