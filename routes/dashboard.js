const express = require('express'); 
const path = require('path');
const routerd = express.Router();
const dotenv = require('dotenv');
dotenv.config();
const {Resend} = require('resend');
const resendClient = new Resend(process.env.TOKEN);
let verificationCodes= new Map();
const { check } = require('express-validator');
const { EmailLimiter , TimeLimiter ,validate,} = require('../utils/ratelimit');
const {upload, cloudinary} = require('../utils/ratelimit');
const validate2 = require('deep-email-validator');
const { type } = require('os');
const {supabase } = require('../utils/supabase');
const {login} = require('../utils/helper');


routerd.post('/doverview', TimeLimiter, async (req, res) => {
    const { data: user, error } = await supabase
        .schema('sih')
        .from('overview')
        .select('*')
        .single();

    if (error) {
        console.error('Error fetching overview data:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching overview data'
        });
    }

    const rate =
        ((user.currently_training + user.employeed) * 100) /
        user.total_trainees;

    const overview = [
        {
            id: 'total',
            label: 'Total Registered Trainees',
            value: user.total_trainees,
            delta: '+2,340 vs last month',
            direction: 'up',
            icon: '👥',
            tone: 'blue'
        },
        {
            id: 'training',
            label: 'Currently Training',
            value: user.currently_training,
            delta: '+840 vs last month',
            direction: 'up',
            icon: '📘',
            tone: 'teal'
        },
        {
            id: 'employed',
            label: 'Employed Trainees',
            value: user.employeed,
            delta: '+1,820 vs last month',
            direction: 'up',
            icon: '💼',
            tone: 'orange'
        },
        {
            id: 'unemployed',
            label: 'Unemployed Trainees',
            value:
                user.total_trainees -
                user.employeed -
                user.currently_training,
            delta: '-312 vs last month',
            direction: 'down',
            icon: '❗',
            tone: 'red'
        },
        {
            id: 'rate',
            label: 'Employment Rate',
            value: Number(rate.toFixed(1)),
            delta: '+1.4% vs last month',
            direction: 'up',
            icon: '📈',
            tone: 'teal'
        },
        {
            id: 'total_trainers',
            label: 'Total Trainers',
            value: user.total_trainers,
            delta: '+0.8% vs last month',
            direction: 'up',
            icon: '✅',
            tone: 'blue'
        }
    ];

    return res.json(overview);
});

