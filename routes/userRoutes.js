const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require("../middlewares/roleMiddleware");

const { registerUser,updateUserProfile, loginUser,updateUserType,createUserProfile,createBusinessProfile,sendMessageRoom,getMessagesSenderRoom,getMessagesRoom, findRoomByUserId, getUserProfile, getImage, OTPVerify,createRoom, sendPasswordOTP, OTPVerifyEmail, updatepassword,createRequirement,
    getAllUsers,getAllUserRequirementsUserFollo,getAllUsersIfFollow,getAllUserRequirements,getPersonalProfile,getBusinessProfile,sendFollowRequest,getFollowRequest,updateRequestStatus,getFollowAllUsers } = userController; 

// Register a new user
router.post('/users/register', registerUser);

router.post('/users/passwordOTP', sendPasswordOTP);



router.post('/sendMessageRoom/:id',verifyToken, sendMessageRoom);

router.post('/users/otpEmail', OTPVerifyEmail);

router.post('/users/otp', OTPVerify);

// Login
router.post('/users/login', loginUser);

router.post('/users/updateType', updateUserType);
router.post('/users/createProfile', createUserProfile);
router.post('/users/createBusinessProfile', createBusinessProfile);
router.post('/users/createRequirement', createRequirement);
router.post('/users/fetchAllUsers', getAllUsers);
router.post('/users/getAllUsersIfFollow', getAllUsersIfFollow);
router.post('/users/fetchAllUserRequirments', getAllUserRequirements);
router.post('/users/fetchAllUserRequirementsUserFollo', getAllUserRequirementsUserFollo);
router.post('/users/fetchPersonalProfile', getPersonalProfile);
router.post('/users/fetchBusinessProfile', getBusinessProfile);
router.post('/users/sendFollowRequest', sendFollowRequest);
router.post('/users/getFollowRequest', getFollowRequest);
router.post('/users/updateRequestStatus', updateRequestStatus);
router.post('/users/getFollowAllUsers', getFollowAllUsers);

// chat routs SBO

router.post('/users/createRoom', createRoom);
router.post('/users/findRoomByUserId', findRoomByUserId);


// Get user profile by id
router.get('/users/profile',verifyToken, getUserProfile);

router.get('/getMessagesSenderRoom/:id',verifyToken, getMessagesSenderRoom);

router.get('/getMessagesRoom/:id',verifyToken, getMessagesRoom);

router.get('/findRoomByUserId/:id',verifyToken, findRoomByUserId);

// Update user profile 
router.put('/users/editProfile/:id',verifyToken, getImage); 

router.put('/users/editProfile',verifyToken, updateUserProfile); 


router.put('/users/updatePass',verifyToken, updatepassword); 

module.exports = router;
