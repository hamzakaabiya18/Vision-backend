require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')
const User     = require('../models/User')
const Activity = require('../models/Activity')
const Group    = require('../models/Group')
const Comment  = require('../models/Comment')
const Message  = require('../models/Message')

const SEED_USERS = [
  { username:'alex_sterling',  email:'alex@vision.app',    password:'Vision2024!', fullName:'Alex Sterling',    avatarUrl:'https://img.relive.com/-/w:640/aHR0cHM6Ly91YS5yZWxpdmUuY2MvMTMyOTkwNDIvSU1HXzMwNjRfMTc0NDk3OTE1ODc2NS5qcGc=', bio:'Endurance athlete & coach. Pushing limits one mile at a time.', location:'Tel Aviv, Israel',       sportTags:['Running','Cycling','Hiking'], totalKm:1842, activities:318, verified:true,  online:true,  role:'admin' },
  { username:'marcus_runs',    email:'marcus@vision.app',  password:'Vision2024!', fullName:'Marcus Chen',       avatarUrl:'https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?w=120&q=80', bio:'Ultramarathon runner. 100-miler finisher. Coffee addict.', location:'San Francisco, CA',     sportTags:['Running','Triathlon'],       totalKm:4200, activities:612, verified:true,  online:true  },
  { username:'sara_cycles',    email:'sara@vision.app',    password:'Vision2024!', fullName:'Sara Valeri',       avatarUrl:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80', bio:'Triathlete. Cyclist. Mountain lover.', location:'Barcelona, Spain',        sportTags:['Cycling','Running','Swimming'], totalKm:3100, activities:445, verified:true,  online:true  },
  { username:'leo_trails',     email:'leo@vision.app',     password:'Vision2024!', fullName:'Leo Brooks',        avatarUrl:'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&q=80', bio:'Trail runner. Sky runner. Vertical obsessed.', location:'Chamonix, France',         sportTags:['Hiking','Running'],           totalKm:2800, activities:389, verified:false, online:true  },
  { username:'maya_fit',       email:'maya@vision.app',    password:'Vision2024!', fullName:'Maya Johnson',      avatarUrl:'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=80', bio:'Cyclist & strength coach. Former pro — still going hard.', location:'Austin, TX',             sportTags:['Cycling','Gym'],             totalKm:1950, activities:270, verified:false, online:false },
  { username:'daniel_runs',    email:'daniel@vision.app',  password:'Vision2024!', fullName:'Daniel Park',       avatarUrl:'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&q=80', bio:'Weekend warrior. Running for tacos.', location:'Seoul, South Korea',       sportTags:['Running'],                   totalKm:820,  activities:144, verified:false, online:false },
  { username:'elena_swims',    email:'elena@vision.app',   password:'Vision2024!', fullName:'Elena Rossi',       avatarUrl:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&q=80', bio:'Open water swimmer. Ironman finisher.', location:'Milan, Italy',             sportTags:['Swimming','Triathlon'],       totalKm:1400, activities:201, verified:false, online:true  },
  { username:'james_lifts',    email:'james@vision.app',   password:'Vision2024!', fullName:'James Okafor',      avatarUrl:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80', bio:'Strength & conditioning coach. Powerlifter turned triathlete.', location:'London, UK',             sportTags:['Gym','Running','Cycling'],   totalKm:2100, activities:330, verified:true,  online:false },
  { username:'sophie_yoga',    email:'sophie@vision.app',  password:'Vision2024!', fullName:'Sophie Laurent',    avatarUrl:'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=120&q=80', bio:'Yoga instructor & trail runner.', location:'Paris, France',            sportTags:['Yoga','Running','Hiking'],   totalKm:1100, activities:188, verified:true,  online:true  },
  { username:'ryo_cycles',     email:'ryo@vision.app',     password:'Vision2024!', fullName:'Ryo Tanaka',        avatarUrl:'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&q=80', bio:'Road cyclist. Cat-2 racer. Obsessed with watts.', location:'Tokyo, Japan',             sportTags:['Cycling'],                   totalKm:6800, activities:512, verified:false, online:false },
  { username:'amara_sprints',  email:'amara@vision.app',   password:'Vision2024!', fullName:'Amara Diallo',      avatarUrl:'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&q=80', bio:'400m sprinter turned marathon runner.', location:'Dakar, Senegal',           sportTags:['Running'],                   totalKm:3400, activities:490, verified:true,  online:true  },
  { username:'carlos_climb',   email:'carlos@vision.app',  password:'Vision2024!', fullName:'Carlos Mendez',     avatarUrl:'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=120&q=80', bio:'Rock climber & trail runner.', location:'Bogotá, Colombia',         sportTags:['Climbing','Hiking','Running'], totalKm:980,  activities:167, verified:false, online:false },
  { username:'nadia_tri',      email:'nadia@vision.app',   password:'Vision2024!', fullName:'Nadia Kowalski',    avatarUrl:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80', bio:'Pro triathlete. Kona qualifier.', location:'Warsaw, Poland',           sportTags:['Triathlon','Swimming','Cycling','Running'], totalKm:8200, activities:880, verified:true, online:true },
  { username:'tariq_desert',   email:'tariq@vision.app',   password:'Vision2024!', fullName:'Tariq Hassan',      avatarUrl:'https://images.unsplash.com/photo-1474176857210-7287d38d27c6?w=120&q=80', bio:'Desert ultrarunner. MDS finisher.', location:'Dubai, UAE',              sportTags:['Running','Hiking'],           totalKm:5100, activities:620, verified:false, online:false },
  { username:'ingrid_ski',     email:'ingrid@vision.app',  password:'Vision2024!', fullName:'Ingrid Bjornstad',  avatarUrl:'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=120&q=80', bio:'Nordic skier & trail runner.', location:'Oslo, Norway',             sportTags:['Ski','Running','Cycling'],   totalKm:3600, activities:420, verified:true,  online:false },
  { username:'omar_rides',     email:'omar@vision.app',    password:'Vision2024!', fullName:'Omar Seif',         avatarUrl:'https://images.unsplash.com/photo-1463453091185-61582044d556?w=120&q=80', bio:'Gravel cyclist & adventure seeker.', location:'Cairo, Egypt',              sportTags:['Cycling','Hiking'],           totalKm:4400, activities:310, verified:false, online:true  },
  { username:'yuki_marathon',  email:'yuki@vision.app',    password:'Vision2024!', fullName:'Yuki Sato',         avatarUrl:'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=120&q=80', bio:'Sub-3 marathoner. Running coach.', location:'Osaka, Japan',             sportTags:['Running'],                   totalKm:5800, activities:680, verified:true,  online:false },
  { username:'kezia_trails',   email:'kezia@vision.app',   password:'Vision2024!', fullName:'Kezia Mwangi',      avatarUrl:'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&q=80', bio:'African trail champion 2024.', location:'Nairobi, Kenya',           sportTags:['Running','Hiking'],           totalKm:9600, activities:1020, verified:true, online:true },
  { username:'luca_iron',      email:'luca@vision.app',    password:'Vision2024!', fullName:'Luca Ferrari',      avatarUrl:'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&q=80', bio:'Ironman athlete. 140.6 miles is my therapy.', location:'Rome, Italy',              sportTags:['Triathlon','Swimming','Cycling','Running'], totalKm:7200, activities:740, verified:false, online:false },
  { username:'priya_yoga_run', email:'priya@vision.app',   password:'Vision2024!', fullName:'Priya Sharma',      avatarUrl:'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=120&q=80', bio:'Marathon runner & yoga instructor.', location:'Mumbai, India',            sportTags:['Running','Yoga'],             totalKm:2600, activities:360, verified:true,  online:true  },
  { username:'ben_endure',     email:'ben@vision.app',     password:'Vision2024!', fullName:'Ben Nakamura',      avatarUrl:'https://images.unsplash.com/photo-1495364141860-b0d03eccd065?w=120&q=80', bio:'XTERRA off-road triathlete.', location:'Honolulu, HI',             sportTags:['Triathlon','Cycling','Swimming'], totalKm:3300, activities:428, verified:false, online:true  },
  { username:'fatima_runs',    email:'fatima@vision.app',  password:'Vision2024!', fullName:'Fatima Al-Rashid',  avatarUrl:'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=120&q=80', bio:'Breaking barriers one stride at a time.', location:'Riyadh, Saudi Arabia',    sportTags:['Running'],                   totalKm:4100, activities:510, verified:true,  online:false },
]

const ACTIVITY_TEMPLATES = [
  { title:'Morning 10K in the hills',      sportType:'Run',   distanceKm:10.2, durationMinutes:52, elevationGainM:180, calories:620,  avgPace:'5:05', location:'Tel Aviv, Israel',   imageUrl:'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80' },
  { title:'Century ride — coast to coast', sportType:'Ride',  distanceKm:161,  durationMinutes:360,elevationGainM:1200,calories:3800, avgPace:'',     location:'California Coast',   imageUrl:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' },
  { title:'Summit trail ultra',            sportType:'Hike',  distanceKm:28.5, durationMinutes:480,elevationGainM:2400,calories:2100, avgPace:'',     location:'Chamonix, France',   imageUrl:'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&q=80' },
  { title:'Open water 5km swim',           sportType:'Swim',  distanceKm:5,    durationMinutes:95, elevationGainM:0,   calories:1100, avgPace:'19:00',location:'Mediterranean Sea',  imageUrl:'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80' },
  { title:'Power yoga — flow session',     sportType:'Yoga',  distanceKm:0,    durationMinutes:60, elevationGainM:0,   calories:320,  avgPace:'',     location:'Paris, France',      imageUrl:'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80' },
  { title:'Strength & hypertrophy day',    sportType:'Gym',   distanceKm:0,    durationMinutes:75, elevationGainM:0,   calories:580,  avgPace:'',     location:'London, UK',         imageUrl:'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
  { title:'Black diamond ski run',         sportType:'Ski',   distanceKm:22,   durationMinutes:240,elevationGainM:3200,calories:1600, avgPace:'',     location:'Oslo, Norway',       imageUrl:'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&q=80' },
  { title:'Rock face — 5.11 lead climb',   sportType:'Climb', distanceKm:0.8,  durationMinutes:180,elevationGainM:400, calories:900,  avgPace:'',     location:'Bogotá, Colombia',   imageUrl:'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80' },
  { title:'Half marathon tempo run',       sportType:'Run',   distanceKm:21.1, durationMinutes:98, elevationGainM:120, calories:1320, avgPace:'4:38', location:'Barcelona, Spain',   imageUrl:'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=800&q=80' },
  { title:'Triathlon brick session',       sportType:'Ride',  distanceKm:40,   durationMinutes:70, elevationGainM:420, calories:980,  avgPace:'',     location:'Warsaw, Poland',     imageUrl:'https://images.unsplash.com/photo-1591491634026-6f3e4fb2eb06?w=800&q=80' },
  { title:'Desert ultra 50K',             sportType:'Run',   distanceKm:50,   durationMinutes:360,elevationGainM:800, calories:3200, avgPace:'7:12', location:'Dubai, UAE',         imageUrl:'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&q=80' },
  { title:'Gravel adventure ride',        sportType:'Ride',  distanceKm:85,   durationMinutes:210,elevationGainM:1400,calories:2200, avgPace:'',     location:'Cairo, Egypt',       imageUrl:'https://images.unsplash.com/photo-1558618047-f4e80c0d7be3?w=800&q=80' },
  { title:'Evening lake swim',            sportType:'Swim',  distanceKm:2.4,  durationMinutes:44, elevationGainM:0,   calories:520,  avgPace:'18:20',location:'Milan, Italy',       imageUrl:'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80' },
  { title:'Mountain trail hike',          sportType:'Hike',  distanceKm:16.2, durationMinutes:280,elevationGainM:1600,calories:1400, avgPace:'',     location:'Nairobi, Kenya',     imageUrl:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80' },
  { title:'Sunrise yoga on the rooftop',  sportType:'Yoga',  distanceKm:0,    durationMinutes:45, elevationGainM:0,   calories:240,  avgPace:'',     location:'Mumbai, India',      imageUrl:'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80' },
  { title:'5K race — personal best',      sportType:'Run',   distanceKm:5,    durationMinutes:19, elevationGainM:40,  calories:380,  avgPace:'3:48', location:'Seoul, South Korea', imageUrl:'https://images.unsplash.com/photo-1470468969717-61d5d54fd036?w=800&q=80' },
  { title:'Century climb — 3 cols',       sportType:'Ride',  distanceKm:142,  durationMinutes:320,elevationGainM:3800,calories:5200, avgPace:'',     location:'Tokyo, Japan',       imageUrl:'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80' },
  { title:'Full Ironman race',            sportType:'Swim',  distanceKm:3.8,  durationMinutes:62, elevationGainM:0,   calories:900,  avgPace:'16:20',location:'Rome, Italy',        imageUrl:'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80' },
  { title:'HIIT circuit training',        sportType:'Gym',   distanceKm:0,    durationMinutes:45, elevationGainM:0,   calories:480,  avgPace:'',     location:'Austin, TX',         imageUrl:'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80' },
  { title:'Mountain snowboard day',       sportType:'Ski',   distanceKm:38,   durationMinutes:360,elevationGainM:4200,calories:2400, avgPace:'',     location:'Oslo, Norway',       imageUrl:'https://images.unsplash.com/photo-1548777123-e216912df7d8?w=800&q=80' },
  { title:'Marathon race day',            sportType:'Run',   distanceKm:42.2, durationMinutes:188,elevationGainM:240, calories:2800, avgPace:'4:27', location:'Osaka, Japan',       imageUrl:'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&q=80' },
  { title:'Enduro mountain bike trail',   sportType:'Ride',  distanceKm:32,   durationMinutes:145,elevationGainM:1800,calories:1900, avgPace:'',     location:'Honolulu, HI',       imageUrl:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' },
  { title:'Sprint triathlon finish',      sportType:'Run',   distanceKm:5,    durationMinutes:22, elevationGainM:30,  calories:360,  avgPace:'4:24', location:'Warsaw, Poland',     imageUrl:'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80' },
  { title:'Yoga nidra + mobility',        sportType:'Yoga',  distanceKm:0,    durationMinutes:90, elevationGainM:0,   calories:180,  avgPace:'',     location:'San Francisco, CA',  imageUrl:'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80' },
  { title:'Coastal 15K run',              sportType:'Run',   distanceKm:15,   durationMinutes:72, elevationGainM:90,  calories:940,  avgPace:'4:48', location:'Tel Aviv, Israel',   imageUrl:'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=800&q=80' },
  { title:'Bouldering session V6-V7',     sportType:'Climb', distanceKm:0,    durationMinutes:120,elevationGainM:200, calories:680,  avgPace:'',     location:'Bogotá, Colombia',   imageUrl:'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80' },
  { title:'Long Sunday ride 180km',       sportType:'Ride',  distanceKm:180,  durationMinutes:390,elevationGainM:2100,calories:4800, avgPace:'',     location:'Tel Aviv, Israel',   imageUrl:'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80' },
  { title:'Evening 8K easy pace',         sportType:'Run',   distanceKm:8,    durationMinutes:44, elevationGainM:60,  calories:490,  avgPace:'5:30', location:'Barcelona, Spain',   imageUrl:'https://images.unsplash.com/photo-1470468969717-61d5d54fd036?w=800&q=80' },
  { title:'Pool intervals 3km',           sportType:'Swim',  distanceKm:3,    durationMinutes:58, elevationGainM:0,   calories:680,  avgPace:'19:20',location:'London, UK',         imageUrl:'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80' },
  { title:'Deadlift PR — 200kg',          sportType:'Gym',   distanceKm:0,    durationMinutes:60, elevationGainM:0,   calories:440,  avgPace:'',     location:'London, UK',         imageUrl:'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
  { title:'Alpine ridge traverse',        sportType:'Hike',  distanceKm:22,   durationMinutes:420,elevationGainM:3100,calories:2600, avgPace:'',     location:'Chamonix, France',   imageUrl:'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&q=80' },
  { title:'Track intervals — 800m ×8',    sportType:'Run',   distanceKm:8,    durationMinutes:36, elevationGainM:0,   calories:520,  avgPace:'4:30', location:'Dakar, Senegal',     imageUrl:'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80' },
  { title:'Criterium race — 60min',       sportType:'Ride',  distanceKm:48,   durationMinutes:60, elevationGainM:200, calories:1400, avgPace:'',     location:'Tokyo, Japan',       imageUrl:'https://images.unsplash.com/photo-1591491634026-6f3e4fb2eb06?w=800&q=80' },
  { title:'Yin yoga deep stretch',        sportType:'Yoga',  distanceKm:0,    durationMinutes:75, elevationGainM:0,   calories:200,  avgPace:'',     location:'Mumbai, India',      imageUrl:'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80' },
  { title:'Ice climbing multi-pitch',     sportType:'Climb', distanceKm:1.2,  durationMinutes:240,elevationGainM:600, calories:1300, avgPace:'',     location:'Bogotá, Colombia',   imageUrl:'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80' },
  { title:'Cross-country ski 20K',        sportType:'Ski',   distanceKm:20,   durationMinutes:95, elevationGainM:380, calories:1200, avgPace:'',     location:'Oslo, Norway',       imageUrl:'https://images.unsplash.com/photo-1548777123-e216912df7d8?w=800&q=80' },
  { title:'Ultra 100K finish',            sportType:'Run',   distanceKm:100,  durationMinutes:840,elevationGainM:4800,calories:7200, avgPace:'8:24', location:'Nairobi, Kenya',     imageUrl:'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&q=80' },
  { title:'Swim-run adventure race',      sportType:'Swim',  distanceKm:6,    durationMinutes:110,elevationGainM:0,   calories:1400, avgPace:'18:20',location:'Honolulu, HI',       imageUrl:'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80' },
  { title:'Bike-run brick workout',       sportType:'Ride',  distanceKm:60,   durationMinutes:130,elevationGainM:600, calories:1800, avgPace:'',     location:'Rome, Italy',        imageUrl:'https://images.unsplash.com/photo-1558618047-f4e80c0d7be3?w=800&q=80' },
  { title:'Sunrise trail run 12K',        sportType:'Run',   distanceKm:12,   durationMinutes:58, elevationGainM:280, calories:780,  avgPace:'4:50', location:'Dubai, UAE',         imageUrl:'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=800&q=80' },
  { title:'Kettlebell conditioning',      sportType:'Gym',   distanceKm:0,    durationMinutes:50, elevationGainM:0,   calories:520,  avgPace:'',     location:'Austin, TX',         imageUrl:'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80' },
  { title:'Jungle trail hike 20K',        sportType:'Hike',  distanceKm:20,   durationMinutes:320,elevationGainM:1200,calories:1800, avgPace:'',     location:'Honolulu, HI',       imageUrl:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80' },
  { title:'10K race — sub-40 attempt',    sportType:'Run',   distanceKm:10,   durationMinutes:38, elevationGainM:30,  calories:620,  avgPace:'3:48', location:'Riyadh, Saudi Arabia',imageUrl:'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80' },
  { title:'400m sprint intervals ×10',    sportType:'Run',   distanceKm:6,    durationMinutes:40, elevationGainM:0,   calories:500,  avgPace:'6:40', location:'Dakar, Senegal',     imageUrl:'https://images.unsplash.com/photo-1470468969717-61d5d54fd036?w=800&q=80' },
  { title:'Gravel fondo 200K',            sportType:'Ride',  distanceKm:200,  durationMinutes:480,elevationGainM:2800,calories:6000, avgPace:'',     location:'Cairo, Egypt',       imageUrl:'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80' },
  { title:'Pilates reformer session',     sportType:'Yoga',  distanceKm:0,    durationMinutes:55, elevationGainM:0,   calories:260,  avgPace:'',     location:'Paris, France',      imageUrl:'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80' },
  { title:'Sea cliff scramble',           sportType:'Climb', distanceKm:2,    durationMinutes:200,elevationGainM:350, calories:980,  avgPace:'',     location:'Barcelona, Spain',   imageUrl:'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80' },
  { title:'Telemark ski descent',         sportType:'Ski',   distanceKm:18,   durationMinutes:180,elevationGainM:2600,calories:1400, avgPace:'',     location:'Oslo, Norway',       imageUrl:'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&q=80' },
  { title:'Half-Ironman swim leg',        sportType:'Swim',  distanceKm:1.9,  durationMinutes:32, elevationGainM:0,   calories:460,  avgPace:'16:50',location:'Warsaw, Poland',     imageUrl:'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80' },
  { title:'Long slow distance 30K run',   sportType:'Run',   distanceKm:30,   durationMinutes:165,elevationGainM:180, calories:1960, avgPace:'5:30', location:'Tokyo, Japan',       imageUrl:'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&q=80' },
]

const GROUP_TEMPLATES = [
  { name:'Alpha Stride Running Club',   description:'Elite runners pushing sub-4 pace every week. Track sessions, tempo runs and race prep.', sportType:'Running',  location:'Tel Aviv, Israel',   privacy:'open',   coverImage:'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&q=80' },
  { name:'Trail Blazers Hiking Co.',    description:'Weekend trail adventures across mountain terrain. All levels from moderate to expert.', sportType:'Hiking',   location:'Chamonix, France',   privacy:'open',   coverImage:'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=600&q=80' },
  { name:'Velocity Velo Cycling',       description:'Road and gravel cycling group. Weekly rides, century challenges and race support.',     sportType:'Cycling',  location:'Barcelona, Spain',   privacy:'open',   coverImage:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80' },
  { name:'Iron Squad Triathlon',        description:'Ironman training syndicate. Structured plans, brick workouts and race day strategy.',   sportType:'Triathlon',location:'Warsaw, Poland',     privacy:'invite', coverImage:'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=80' },
  { name:'Summit Seekers Climbers',     description:'Rock and ice climbing collective. Safety first, vertical always. 5.10+ recommended.', sportType:'Climbing', location:'Bogotá, Colombia',   privacy:'open',   coverImage:'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=600&q=80' },
  { name:'Nordic Snow Warriors',        description:'Ski and snowboard crew. Race training, backcountry touring and powder hunting.',       sportType:'Skiing',   location:'Oslo, Norway',       privacy:'open',   coverImage:'https://images.unsplash.com/photo-1548777123-e216912df7d8?w=600&q=80' },
  { name:'Open Water Swim Club',        description:'Ocean and lake swimmers. 1K to 10K distances. Safety buddy system always.',           sportType:'Swimming', location:'Mediterranean Sea',  privacy:'open',   coverImage:'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=600&q=80' },
  { name:'Mind & Body Flow Studio',     description:'Yoga, pilates and mobility for athletes. Recovery-focused sessions with expert guides.',sportType:'Yoga',     location:'Paris, France',      privacy:'open',   coverImage:'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80' },
]

const COMMENT_BODIES = [
  'Incredible effort! You crushed it.',
  'That elevation gain is no joke. Respect!',
  'Pace looks amazing — keep it up!',
  'Love the route! Need to try this one.',
  'Goals! This is so inspiring.',
  'Beast mode activated.',
  'Sub-5 pace? You are flying!',
  'That distance though... wow.',
  'Segment looks brutal. Nice work pushing through!',
  'Would love to join next time!',
]

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB')

  // Clear
  await Promise.all([User.deleteMany(), Activity.deleteMany(), Group.deleteMany(), Comment.deleteMany(), Message.deleteMany()])
  console.log('Collections cleared')

  // Users
  const users = await User.insertMany(SEED_USERS)
  console.log(`${users.length} users seeded`)

  const userMap = {}
  users.forEach(u => { userMap[u.username] = u })

  // Follow graph (each user follows the next 5 in list)
  for (let i = 0; i < users.length; i++) {
    const followees = users.slice((i + 1) % users.length, (i + 6) % users.length + 1)
    await User.findByIdAndUpdate(users[i]._id, { $set: { following: followees.map(f => f._id) } })
    for (const f of followees) {
      await User.findByIdAndUpdate(f._id, { $addToSet: { followers: users[i]._id } })
    }
  }

  // Activities (assign templates cyclically across users)
  const activities = []
  for (let i = 0; i < ACTIVITY_TEMPLATES.length; i++) {
    const u = users[i % users.length]
    const daysAgo = Math.floor(Math.random() * 90)
    const act = await Activity.create({
      ...ACTIVITY_TEMPLATES[i],
      user: u._id,
      createdAt: new Date(Date.now() - daysAgo * 86400000),
    })
    activities.push(act)
  }
  console.log(`${activities.length} activities seeded`)

  // Comments (2-3 per activity)
  let commentCount = 0
  for (const act of activities) {
    const numComments = 2 + Math.floor(Math.random() * 2)
    for (let k = 0; k < numComments; k++) {
      const commenter = users[(Math.floor(Math.random() * users.length))]
      const comment = await Comment.create({
        user: commenter._id,
        activity: act._id,
        body: COMMENT_BODIES[Math.floor(Math.random() * COMMENT_BODIES.length)],
      })
      act.comments.push(comment._id)
      commentCount++
    }
    // likes (3-10 random users)
    const likerCount = 3 + Math.floor(Math.random() * 8)
    const likers = users.sort(() => Math.random() - 0.5).slice(0, likerCount)
    act.likes = likers.map(l => l._id)
    await act.save()
  }
  console.log(`${commentCount} comments seeded`)

  // Groups
  const adminUser = userMap['alex_sterling']
  const groupDocs = []
  for (let i = 0; i < GROUP_TEMPLATES.length; i++) {
    const g = await Group.create({
      ...GROUP_TEMPLATES[i],
      admin: users[i % users.length]._id,
      members: users.slice(0, 4 + Math.floor(Math.random() * 6)).map(u => u._id),
    })
    groupDocs.push(g)
  }
  console.log(`${groupDocs.length} groups seeded`)

  // Messages (between first few users)
  const msgPairs = [[0,1],[1,2],[0,2],[3,4],[0,3]]
  let msgCount = 0
  for (const [a, b] of msgPairs) {
    const msgs = [
      { sender: users[a]._id, receiver: users[b]._id, body: 'Hey! Great workout today.' },
      { sender: users[b]._id, receiver: users[a]._id, body: 'Thanks! Your pace was incredible out there.' },
      { sender: users[a]._id, receiver: users[b]._id, body: 'Are you joining the group ride this weekend?' },
    ]
    await Message.insertMany(msgs)
    msgCount += msgs.length
  }
  console.log(`${msgCount} messages seeded`)

  console.log('\n✓ Seed complete!')
  console.log(`  Users: ${users.length} | Activities: ${activities.length} | Groups: ${groupDocs.length}`)
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
