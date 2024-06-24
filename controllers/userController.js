const bcrypt = require('bcrypt');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middlewares/authMiddleware');
const fs = require('fs');
const path = require('path');

const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const { error } = require('console');



const generateToken = (user) => {
  const payload = {
    email: user.email,
    password: user.password,
    id: user.id,
  };
  return jwt.sign(payload, 'crud', { expiresIn: '24h' });
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'sponda.netclues@gmail.com',
    pass: 'qzfm wlmf ukeq rvvb'
  }
});

function AddMinutesToDate(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}
const otpganrate = Math.floor(100000 + Math.random() * 900000);
const now = new Date();
const expiration_time = AddMinutesToDate(now, 10);

const genrateOTP = () => {
  const payload = {
    otpganrate,
    now,
    expiration_time,
  };
  return (payload);

}
const otpPassword = Math.floor(1000 + Math.random() * 9000);

function generateOTPS() {
  const payload = {
    otpPassword,
    now,
    expiration_time,
  };
  return (payload);
}

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'sponda.netclues@gmail.com',
      pass: 'qzfm wlmf ukeq rvvb'
    }
  });

  const mailOptions = {
    from: 'sponda.netclues@gmail.com',
    to: options.to,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(mailOptions);
};

const sendPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const otp = generateOTPS();
    console.log(otp);



    // Send OTP via email
    await sendEmail({
      to: email,
      subject: 'Your OTP',
      message: `<p>Your OTP is: <strong>${otp}</strong></p>`,
    });

    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}



const registerUser = async (req, res) => {
  try {
    const { name, batchYear, mobileNumber } = req.body;

    // Validate mobile number
    const mobileNumberRegex = /^[6-9]\d{9}$/;
    if (!mobileNumberRegex.test(mobileNumber)) {
      console.log("Invalid mobile number");
      res.status(400).json({ error: true, message: 'Invalid mobile number' });
      return;
    }

    const existingUser = await sequelize.query(
      'SELECT * FROM register WHERE mobileNumber = ?',
      {
        replacements: [mobileNumber],
        type: QueryTypes.SELECT
      }
    );

    if (existingUser.length === 0) {
      const result = await sequelize.query(
        'INSERT INTO register (name, batchYear, mobileNumber) VALUES (?, ?, ?)',
        {
          replacements: [name, batchYear, mobileNumber],
          type: QueryTypes.INSERT
        }
      );

      const userId = result[0];

      // Generate and send OTP
      // await sendOTP(mobileNumber);
      res.status(200).json({ error: false, message: 'User registered successfully', userId: userId });
    } else {
      res.status(400).json({ error: true, message: 'Mobile number already registered' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};


const accountSid = 'ACd9806a2bd9b26c568fef24290dbfdbec';
const authToken = 'c3362abb36dbc9d3ab407886b70c1452';
const client = require('twilio')(accountSid, authToken);

const sendOTP = async (mobileNumber) => {
  // Generate a 6-digit OTP
  const otp = otpGenerator.generate(6, { alphabets: false, upperCase: false, specialChars: false });

  console.log(otp);
  // Save the OTP to the database
  await sequelize.query(
    'INSERT INTO otp (otp, mobileNumber, createdAt) VALUES (?, ?, ?)',
    {
      replacements: [otp, mobileNumber, new Date()],
      type: QueryTypes.INSERT
    }
  );

  // Send the OTP to the user's mobile number using Twilio's SMS API
  client.messages
    .create({
      body: `Your OTP is ${otp}`,
      from: '+12178639574', // Replace with your Twilio phone number
      to: `+${mobileNumber}`
    })
    .then((message) => console.log(message.sid))
    .catch((error) => console.error(error));
};


const OTPVerifyEmail = async (req, res) => {
  try {
    const { otp } = req.body; // get both otp and email from request body

    const existingUser = await sequelize.query('SELECT * FROM users WHERE email');
    if (existingUser) {
      const user = existingUser;

      if (otp == otpPassword) {
        const currentTime = new Date();
        const otpExpiryTime = new Date(expiration_time);

        if (currentTime < otpExpiryTime) {
          const token = generateToken(user);
          const userId = user.id;
          const userRole = user.userRole;

          return res.status(200).send({ message: 'Login success!', token: token, userId: userId, userRole: userRole });
        } else {
          return res.status(401).send({ message: 'OTP has expired! Please request for a new OTP.' });
        }
      } else {
        return res.status(401).send({ message: 'Invalid OTP! Please enter a valid OTP.' });
      }
    } else {
      return res.status(404).send({ message: 'Email not found! Sign up!' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: 'Error in login check api!',
      error
    });
  }
};

const OTPVerify = async (req, res) => {
  try {
    const { otp } = req.body; // get both otp and email from request body

    const existingUser = await sequelize.query('SELECT * FROM users WHERE email');
    if (existingUser) {
      const user = existingUser;

      if (otp == otpganrate) {
        const currentTime = new Date();
        const otpExpiryTime = new Date(expiration_time);

        if (currentTime < otpExpiryTime) {
          const token = generateToken(user);
          const userId = user.id;
          const userRole = user.userRole;

          return res.status(200).send({ message: 'Login success!', token: token, userId: userId, userRole: userRole });
        } else {
          return res.status(401).send({ message: 'OTP has expired! Please request for a new OTP.' });
        }
      } else {
        return res.status(401).send({ message: 'Invalid OTP! Please enter a valid OTP.' });
      }
    } else {
      return res.status(404).send({ message: 'Email not found! Sign up!' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: 'Error in login check api!',
      error
    });
  }
};

const updateUserType = async (req, res) => {
  try {
    const { type, userId } = req.body;

    await sequelize.query(
      'UPDATE register SET type = ? WHERE id = ?',
      {
        replacements: [type, userId],
        type: sequelize.QueryTypes.UPDATE
      }
    );

    res.json({ error: false, message: 'User type updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

const createUserProfile = async (req, res) => {
  try {
    const { userId, email, qualification, occupation, employment, about, profile, cover } = req.body;

    // Validate mobile number
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Invalid email");
      res.status(400).json({ error: true, message: 'Invalid email' });
      return;
    }

    const existingUser = await sequelize.query(
      'SELECT * FROM personal_profile WHERE user_id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    if (existingUser.length === 0) {
      const result = await sequelize.query(
        'INSERT INTO personal_profile (user_id,email,qualification,occupation,employment,about,profile,cover) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        {
          replacements: [userId, email, qualification, occupation, employment, about, profile, cover],
          type: QueryTypes.INSERT
        }
      );
      // Generate and send OTP
      // await sendOTP(mobileNumber);
      res.status(200).json({ error: false, message: 'Personal Profile create successfully' });
    } else {
      res.status(400).json({ error: true, message: 'Personal Profile is already exist' });
    }
  } catch (error) {
    res.status(500).json({ error: true, message: error });
  }
};

const createBusinessProfile = async (req, res) => {
  try {
    const { userId, business_name, email, business_type, business_category, description, profile, cover, address, homeTwon } = req.body;

    // Validate mobile number
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Invalid email");
      res.status(400).json({ error: true, message: 'Invalid email' });
      return;
    }

    const existingUser = await sequelize.query(
      'SELECT * FROM business_profile WHERE user_id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    if (existingUser.length === 0) {
      const result = await sequelize.query(
        'INSERT INTO business_profile (user_id,business_name,email,business_type,business_category,description,profile,cover,address,homeTwon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        {
          replacements: [userId, business_name, email, business_type, business_category, description, profile, cover, address, homeTwon],
          type: QueryTypes.INSERT
        }
      );
      // Generate and send OTP
      // await sendOTP(mobileNumber);
      res.status(200).json({ error: false, message: 'Business Profile create successfully' });
    } else {
      res.status(400).json({ error: true, message: 'Business Profile is already exist' });
    }
  } catch (error) {
    res.status(500).json({ error: true, message: error });
  }
};

const createRequirement = async (req, res) => {
  try {
    const { userId, title, description, images, value } = req.body;
    const result = await sequelize.query(
      'INSERT INTO add_new_requirement (user_id,Title,Description, value) VALUES (?,?,?,?)',
      {
        replacements: [userId, title, description, value],
        type: QueryTypes.INSERT
      }
    );

    if (result && result[0] != null) {
      const reqId = result[0];
      if (Array.isArray(images)) {

        for (let index = 0; index < images.length; index++) {
          const data = images[index];
          await sequelize.query(
            'INSERT INTO requirment_photo (requirment_id, photo) VALUES (?, ?)',
            {
              replacements: [reqId, data],
              type: QueryTypes.INSERT
            }
          );
        }

        res.status(200).json({ message: 'Requirement created!', error: false });
      }
    } else {
      res.status(400).json({ message: 'Data not inserted', error: true });
    }
  } catch (error) {
    console.error('Error creating Requirement:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};


const getAllUserRequirementsUserFollo = async (req, res) => {
  try {
    const { userId } = req.body;

    // Fetch users who follow or are followed by the given user
    const users = await sequelize.query(
      `SELECT id FROM register
      WHERE id != :userId 
      AND (id IN (SELECT user_id FROM user_follower WHERE follower_id = :userId AND status = '0')
           OR id IN (SELECT follower_id FROM user_follower WHERE user_id = :userId AND status = '0'))`,
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT
      }
    );

    const idArray = users.map(user => user.id);
    if (idArray.length === 0) {
      return res.status(200).json({ error: false, message: "No requirements found", allRequirment: [] });
    }

    // Add the current user to the array, but filter their requirements below
    idArray.push(userId);

    // Fetch requirements, excluding the current user's requirements
    const requirementsQuery = `
      SELECT add_new_requirement.*, 
             requirment_photo.id AS PHID, 
             requirment_photo.photo AS RIMAGE,
             register.name AS userName,
             register.type AS userType,
             saved_requirements.requirement_id AS savedRequirementId
      FROM add_new_requirement
      LEFT JOIN requirment_photo ON add_new_requirement.id = requirment_photo.requirment_id
      JOIN register ON add_new_requirement.user_id = register.id
      LEFT JOIN saved_requirements ON add_new_requirement.id = saved_requirements.requirement_id AND saved_requirements.user_id = :userId
      WHERE add_new_requirement.user_id IN (:idArray) 
      AND add_new_requirement.user_id != :userId 
      AND add_new_requirement.value = 'Now'
    `;

    const requirements = await sequelize.query(requirementsQuery, {
      replacements: { idArray, userId },
      type: sequelize.QueryTypes.SELECT
    });

    const groupedRequirements = requirements.reduce((acc, row) => {
      const { id, PHID, RIMAGE, userName, userType, savedRequirementId, ...requirementData } = row;
      if (!acc[id]) {
        acc[id] = {
          id,  // Include the id explicitly
          ...requirementData,
          userName,
          userType,
          isSaved: !!savedRequirementId,
          images: [],
        };
      }
      if (PHID) {
        acc[id].images.push({ id: PHID, url: RIMAGE });
      }
      return acc;
    }, {});

    const resultArray = Object.values(groupedRequirements);

    res.status(200).json({ error: false, message: "Requirements Fetched", allRequirment: resultArray });
  } catch (error) {
    console.error('Error fetching user requirements:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};



const saveRequirement = async (req, res) => {
  try {
    const { userId, requirementId, requirementUserId } = req.body;

    // Check if the requirement is already saved by the user
    const existingSave = await sequelize.query(
      'SELECT * FROM saved_requirements WHERE user_id = ? AND requirement_id = ?',
      {
        replacements: [userId, requirementId],
        type: QueryTypes.SELECT
      }
    );

    if (existingSave.length > 0) {
      // If the requirement is already saved, delete it
      const deleteResult = await sequelize.query(
        'DELETE FROM saved_requirements WHERE user_id = ? AND requirement_id = ?',
        {
          replacements: [userId, requirementId],
          type: QueryTypes.DELETE
        }
      );


      console.log("hello");


      // Check if rows were actually affected
      return res.status(200).json({ message: 'Requirement unsaved successfully', error: false });
    } else {
      // If the requirement is not saved, insert it
      const result = await sequelize.query(
        'INSERT INTO saved_requirements (user_id, requirement_id, requirementUserId) VALUES (?, ?, ?)',
        {
          replacements: [userId, requirementId, requirementUserId],
          type: QueryTypes.INSERT
        }
      );

      console.log("hello saved");

      if (result && result[0] !== undefined) {
        return res.status(200).json({ message: 'Requirement saved successfully', error: false });
      } else {
        return res.status(400).json({ message: 'Failed to save requirement', error: true });
      }
    }
  } catch (error) {
    console.error('Error saving requirement:', error);
    return res.status(500).json({ message: 'Internal server error', error: true });
  }
};

const getSavedRequirements = async (req, res) => {
  try {
    const { userId } = req.body;

    const requirementsQuery = `
      SELECT 
        add_new_requirement.*, 
        requirment_photo.id AS PHID, 
        requirment_photo.photo AS RIMAGE 
      FROM 
        saved_requirements
      JOIN 
        add_new_requirement ON saved_requirements.requirement_id = add_new_requirement.id
      LEFT JOIN 
        requirment_photo ON add_new_requirement.id = requirment_photo.requirment_id
      WHERE 
        saved_requirements.user_id = ?
    `;

    const requirements = await sequelize.query(requirementsQuery, {
      replacements: [userId],
      type: QueryTypes.SELECT
    });

    const groupedRequirements = requirements.reduce((acc, row) => {
      const { id, PHID, RIMAGE, ...requirementData } = row;
      if (!acc[id]) {
        acc[id] = {
          id, // Include the requirement ID here
          ...requirementData,
          images: [],
        };
      }
      if (PHID) {
        acc[id].images.push({ id: PHID, url: RIMAGE });
      }
      return acc;
    }, {});

    const resultArray = Object.values(groupedRequirements);

    res.status(200).json({ error: false, message: "Requirements fetched successfully", allRequirment: resultArray });
  } catch (error) {
    console.error('Error fetching saved requirements:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};


const getAllUserRequirements = async (req, res) => {
  try {
    const { userId } = req.body;

    const requirments = await sequelize.query(
      'SELECT add_new_requirement.*, requirment_photo.id AS PHID, requirment_photo.photo AS RIMAGE FROM add_new_requirement LEFT JOIN requirment_photo ON add_new_requirement.id = requirment_photo.requirment_id WHERE add_new_requirement.user_id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    const groupedRequirements = requirments.reduce((acc, row) => {
      const { id, PHID, RIMAGE, ...requirementData } = row;
      if (!acc[id]) {
        acc[id] = {
          id, // Include the requirement ID here
          ...requirementData,
          images: [],
        };
      }
      if (PHID) {
        acc[id].images.push({ id: PHID, url: RIMAGE });
      }
      return acc;
    }, {});

    const resultArray = Object.values(groupedRequirements);

    res.status(200).json({ error: false, message: "Requirment Fetch", allRequirment: resultArray });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error', error: true });
  }
};

const getAllUsers = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { userId } = req.body;
    const users = await sequelize.query(
      'SELECT r.*,uf.id AS FID,uf.user_id AS REQID,uf.status AS FSTATUS FROM register r LEFT JOIN user_follower uf ON (r.id = uf.user_id AND uf.follower_id = ?) OR (r.id = uf.follower_id AND uf.user_id = ?) AND uf.status != ? WHERE r.id != ?',
      {
        replacements: [userId, userId, '2', userId],
        type: QueryTypes.SELECT
      }
    );
    res.status(200).json({ error: false, message: "User Data Fetch", allUsers: users });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error', error: true });
  }
};

const getFollowAllUsers = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { userId } = req.body;
    const users = await sequelize.query(
      'SELECT * FROM register WHERE id != ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    const userIds = users.map(user => user.id);
    const followers = await sequelize.query(
      'SELECT * FROM user_follower WHERE user_id IN (:userIds) OR follower_id IN (:userIds)',
      {
        replacements: { userIds },
        type: QueryTypes.SELECT
      }
    );

    const usersWithFollowers = users.map(user => {
      user.followers = followers.filter(follower => follower.userId === user.id);
      return user;
    });

    res.status(200).json({ error: false, message: "User Data Fetch", allUsers: usersWithFollowers });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error', error: true });
  }
};

const getPersonalProfile = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { userId } = req.body;
    const users = await sequelize.query(
      'SELECT personal_profile.*,register.name AS NAME,register.batchYear as BYEAR,register.mobileNumber as PHONE FROM personal_profile INNER JOIN register ON personal_profile.user_id = register.id WHERE personal_profile.user_id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );
    res.status(200).json({ error: false, message: "User Data Fetch", personalProfile: users });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error', error: true });
  }
};

const getBusinessProfile = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { userId } = req.body;
    const users = await sequelize.query(
      'SELECT business_profile.*,register.name AS NAME,register.batchYear as BYEAR,register.mobileNumber as PHONE FROM business_profile INNER JOIN register ON business_profile.user_id = register.id WHERE business_profile.user_id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );
    res.status(200).json({ error: false, message: "User Data Fetch", businessProfile: users });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error', error: true });
  }
};

const sendFollowRequest = async (req, res) => {
  try {
    const { userId, followerId } = req.body;

    const existingUser = await sequelize.query(
      'SELECT * FROM user_follower WHERE user_id = ? AND follower_id = ? AND status != ?',
      {
        replacements: [userId, followerId, '2'],
        type: QueryTypes.SELECT
      }
    );

    const existingUser1 = await sequelize.query(
      'SELECT * FROM user_follower WHERE user_id = ? AND follower_id = ? AND status != ?',
      {
        replacements: [followerId, userId, '2'],
        type: QueryTypes.SELECT
      }
    );

    if (existingUser.length === 0 && existingUser1.length === 0) {
      const result = await sequelize.query(
        'INSERT INTO user_follower (user_id,follower_id) VALUES (?, ?)',
        {
          replacements: [userId, followerId],
          type: QueryTypes.INSERT
        }
      );
      // Generate and send OTP
      // await sendOTP(mobileNumber);
      res.status(200).json({ error: false, message: 'Request send successfully' });
    } else {
      res.status(400).json({ error: true, message: 'Request already exist' });
    }
  } catch (error) {
    res.status(500).json({ error: true, message: error });
  }
};

const getFollowRequest = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { userId } = req.body;
    const users = await sequelize.query(
      'SELECT user_follower.*,register.name AS NAME,register.batchYear as BYEAR,register.mobileNumber as PHONE FROM user_follower INNER JOIN register ON user_follower.user_id = register.id WHERE user_follower.follower_id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );
    res.status(200).json({ error: false, message: "Follow Request Fetch", followRequest: users });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error', error: true });
  }
};

const updateRequestStatus = async (req, res) => {
  try {
    const { reqId, status } = req.body;

    await sequelize.query(
      'UPDATE user_follower SET status = ? WHERE id = ?',
      {
        replacements: [status, reqId],
        type: sequelize.QueryTypes.UPDATE
      }
    );

    var msg = "";
    if (status == "0") {
      msg = "Accept request successfully";
    } else {
      msg = "Reject request successfully";
    }

    res.json({ error: false, message: msg });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

// i want to check user enter otp is valid or not and if valid then verify otp and go to home screen 

// Function to login
const loginUser = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    const [existingUser] = await sequelize.query('SELECT * FROM register WHERE mobileNumber = ?',
      { replacements: [mobileNumber], type: QueryTypes.SELECT });

    // const [existingUserLoginWith] = await sequelize.query('SELECT type FROM register WHERE mobileNumber = ? ',
    // { replacements: [mobileNumber], type: QueryTypes.SELECT });

    if (existingUser) {

      const user = existingUser;

      const token = generateToken(user);
      const userId = user.id;
      const type = user.type;
      const status = user.status;

      return res.status(200).send({ error: false, message: 'Login success!', token: token, userId: userId, type: type, status: status });
    } else {
      return res.status(404).send({ error: true, message: 'Mobile Number not found! Sign up!' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: 'Error in login check api!',
      error
    });
  }
};

// Function to get user profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const users = await sequelize.query(
      'SELECT * FROM users WHERE id != :userId',
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT
      }
    );
    res.json(users);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(userId);
    const { email, password, name } = req.body;

    await sequelize.query(
      'UPDATE users SET email = ?, password = ?, name = ? WHERE id = ?',
      {
        replacements: [email, password, name, userId],
        type: sequelize.QueryTypes.UPDATE
      }
    );

    res.json({ message: 'User profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const getImage = async (req, res) => {
  try {
    console.log(req.files)
    let id = req.params.id
    let image = req.files.profile_pic //key and auth


    if (image.length > 1) {
      throw new error('multiple file not allowed!')
    }

    const dirExists = fs.existsSync(`public/assets/`);

    if (!dirExists) {
      fs.mkdirSync(`public/assets/`, { recursive: true });
    }

    if (image == undefined || image == null) throw new Error("file not found!");

    let savePath = `/public/assets/${Date.now()}.${image.name.split(".").pop()}`

    image.mv(path.join(__dirname, ".." + savePath), async (err) => {
      if (err) throw new Error("error in uploading")

      else {
        const updateQuery = 'UPDATE users SET profile_pic = :profile_pic WHERE id = :id';

        await sequelize.query(updateQuery, {
          replacements: { profile_pic: savePath, id: id },
          type: sequelize.QueryTypes.UPDATE
        });
      }
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'error in file upload api!' });
  }
}



const updatepassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const email = req.user.email;
    console.log(userId);
    const { password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    await sequelize.query(
      'UPDATE users SET password = ? WHERE email = ?',
      { replacements: [hashedPassword, email], type: QueryTypes.UPDATE }
    );
    res.json({ message: 'password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};












// const findRoomByUserId = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const rooms = await sequelize.query(
//       'SELECT user_id FROM rooms ',
//       {
//         type: sequelize.QueryTypes.SELECT,
//       }
//     );

//     const roomExists = rooms.map(room => room.user_id === userId);

//     if (!roomExists) {
//       res.status(404).json({ error: 'Room not found' });
//       return;
//     }

//     const selectUserId = await sequelize.query(
//       `SELECT * FROM posts WHERE user_id IN (?)`,
//       {
//         type: sequelize.QueryTypes.SELECT,
//         replacements: [rooms[0].user_id],
//       }
//     );

//     res.json(selectUserId);
//   } catch (error) {
//     console.error('Error finding room by user ID:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };
const sendMessageRoom = async (req, res) => {
  try{
    const { content, senderId, roomId,type } = req.body;
  console.log(req.body);

  await sequelize.query(
    'INSERT INTO message_room (senderId,roomId, content,type) VALUES (?, ?, ?, ?)',
    {
      replacements: [senderId, roomId, content, type],
      type: sequelize.QueryTypes.INSERT
    }
  );

  res.status(200).json({error: false,message: "send success "});
  }catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
}


// const sendMessageRoom = async (req, res) => {
//   const { content, senderId, receiverId,type } = req.body;
//   const receiverId = req.params.id;
//   console.log(receiverId);
//   const senderId = req.user.id;

//   await sequelize.query(
//     'INSERT INTO group_chat (user_id, room_id, created_at, content) VALUES (?, ?, NOW(), ?)',
//     {
//       replacements: [senderId, receiverId, content],
//       type: sequelize.QueryTypes.INSERT
//     }
//   );

//   res.json({ message: 'Message sent successfully' });
// }



const getMessagesSenderRoom = async (req, res) => {
  const receiverId = req.params.id;
  console.log(receiverId);
  const senderId = req.user.id;

  const messages = await sequelize.query(
    'SELECT * FROM group_chat WHERE (user_id = ? AND room_id = ?) OR (user_id = ? AND room_id = ?) ORDER BY created_at ASC',
    {
      replacements: [senderId, receiverId, senderId, receiverId],
      type: sequelize.QueryTypes.SELECT
    }
  );

  res.json(messages);
}


// const getAllUsersIfFollow = async (req, res) => {
//   try {
//     // const userId = req.user.id;
//     const { userId } = req.body;
//     const users = await sequelize.query(
//       `SELECT r.*, uf.id AS FID, uf.user_id AS REQID, uf.status AS FSTATUS
//        FROM register r
//        LEFT JOIN user_follower uf ON 
//          (r.id = uf.user_id AND uf.follower_id = ? AND uf.status = 0) OR 
//          (r.id = uf.follower_id AND uf.user_id = ? AND uf.status = 0)
//        WHERE r.id != ?`,
//       {
//         replacements: [userId, userId, userId],
//         type: QueryTypes.SELECT
//       }
//     );
//     res.status(200).json({ error: false, message: "User Data Fetch", allUsers: users });
//   } catch (error) {
//     console.error('Error fetching user profile:', error);
//     res.status(500).json({ message: 'Internal server error', error: true });
//   }
// };


const getAllUsersIfFollow = async (req, res) => {
  try {
    const { userId } = req.body;

    // Fetch users who follow the given user or are followed by the given user
    const users = await sequelize.query(
      `SELECT * FROM register
      WHERE id != :userId
      AND (id IN (SELECT user_id FROM user_follower WHERE follower_id = :userId AND status = '0')
           OR id IN (SELECT follower_id FROM user_follower WHERE user_id = :userId AND status = '0'))`,
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT
      }
    );

    // Initialize unseen messages count for each user
    for (let i = 0; i < users.length; i++) {
      const unseenMessagesCount = await sequelize.query(
        'SELECT COUNT(*) as count FROM message WHERE seen = false AND (senderId = ? AND reciverId = ?)',
        {
          replacements: [ users[i].id, userId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      // Add unseen message count to each user object
      users[i].unseenMessagesCount = unseenMessagesCount[0].count;
    }

    res.status(200).json({ error: false, message: "Users fetched successfully", chatUsers: users });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};


const markMessagesAsSeen = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    await sequelize.query(
      'UPDATE message SET seen = true, seen_at = NOW() WHERE senderId = ? AND reciverId = ?',
      {
        replacements: [receiverId, senderId],
        type: sequelize.QueryTypes.UPDATE,
      }
    );

    res.status(200).json({ error: false, message: "Messages marked as seen" });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};




// chat api 


const createRoom = async (req, res) => {
  try {
    const { userId, selectedUsers } = req.body;

    // Assuming `userId` is the ID of the current user creating the room

    // Insert into chat_rooms table
    const result = await sequelize.query(
      'INSERT INTO rooms (user_id) VALUES (?)',
      {
        replacements: [userId],
        type: sequelize.QueryTypes.INSERT
      }
    );

    const roomId = result[0]; // Assuming the ID of the created room is returned
    const participants = [...selectedUsers, userId];

    // Insert participants into chat_room_participants table
    for (const participant of participants) {
      await sequelize.query(
        'INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)',
        {
          replacements: [roomId, participant],
          type: sequelize.QueryTypes.INSERT
        }
      );
    }
    res.status(200).json({ error: false, message: 'Room Created Successfully' });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

const findRoomByUserId = async (req, res) => {
  try {
    const { userId } = req.body;

    // Validate userId
    if (!userId) {
      return res.status(400).json({ error: 'UserId is required' });
    }

    // Fetch rooms where the user is either the creator or a participant
    const roomsQuery = await sequelize.query(
      `
      SELECT DISTINCT rooms.id, rooms.user_id, rooms.created_at
      FROM rooms
      LEFT JOIN room_participants ON rooms.id = room_participants.room_id
      WHERE rooms.user_id = ? OR room_participants.user_id = ?
      `,
      {
        replacements: [userId, userId],
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (roomsQuery.length === 0) {
      return res.status(404).json({ error: true, message: 'No rooms found for this user' });
    }

    // Fetch participants for each room
    const roomDetails = await Promise.all(roomsQuery.map(async (room) => {
      const participantsQuery = await sequelize.query(
        `
        SELECT register.id, register.name
        FROM room_participants
        JOIN register ON room_participants.user_id = register.id
        WHERE room_participants.room_id = ?
        `,
        {
          replacements: [room.id],
          type: sequelize.QueryTypes.SELECT
        }
      );

      return {
        room: {
          id: room.id,
          user_id: room.user_id,
          created_at: room.created_at
        },
        participants: participantsQuery
      };
    }));

    console.log(roomDetails);
    console.log(roomsQuery[0].id);

    for (let i = 0; i < roomsQuery.length; i++) {
      console.log(roomsQuery[i].id);
      const unseenMessagesCount = await sequelize.query(
        'SELECT COUNT(*) as count FROM message_room WHERE seen = false AND (roomId = ? AND senderId != ?)',
        {
          replacements: [ roomsQuery[i].id, userId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      // Add unseen message count to each user object
      roomDetails[i].unseenMessagesCount = unseenMessagesCount[0].count;

    }



    res.status(200).json({ error: false, message: "Room Fetch", roomDetails: roomDetails });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};





const sendMessage = async (req, res) => {
  try{
    const { content, senderId, receiverId,type } = req.body;
  console.log(req.body);

  // await sequelize.query("SET SESSION max_allowed_packet=67108864");

  await sequelize.query(
    'INSERT INTO message (senderId, reciverId, content,type) VALUES (?, ?, ?, ?)',
    {
      replacements: [senderId, receiverId, content,type],
      type: sequelize.QueryTypes.INSERT,
    }
  );

  res.status(200).json({error: false,message: "send success "});
  }catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
}

const getMessages = async (req, res) => {
  try {
    const { receiverId, senderId } = req.body;
    console.log(receiverId);

    // Fetch messages between sender and receiver
    const messages = await sequelize.query(
      'SELECT * FROM message WHERE (senderId = ? AND reciverId = ?) OR (reciverId = ? AND senderId = ?) ORDER BY createdAt DESC',
      {
        replacements: [senderId, receiverId, senderId, receiverId],
        type: sequelize.QueryTypes.SELECT
      }
    );

    // Process messages to include requirement details if needed
    for (let i = 0; i < messages.length; i++) {
      console.log(messages[i].type);
      if (messages[i].type === "requirement") {
        const requirementId = messages[i].content;
        console.log(requirementId);

        const requirementsQuery = `
          SELECT add_new_requirement.*, 
                 requirment_photo.id AS PHID, 
                 requirment_photo.photo AS RIMAGE
          FROM add_new_requirement
          LEFT JOIN requirment_photo ON add_new_requirement.id = requirment_photo.requirment_id
          WHERE add_new_requirement.id = ?
        `;

        const requirements = await sequelize.query(requirementsQuery, {
          replacements: [requirementId],
          type: sequelize.QueryTypes.SELECT
        });

        const groupedRequirements = requirements.reduce((acc, row) => {
          const { id, PHID, RIMAGE, ...requirementData } = row;
          if (!acc[id]) {
            acc[id] = {
              id,
              ...requirementData,
              images: [],
            };
          }
          if (PHID) {
            acc[id].images.push({ id: PHID, url: RIMAGE });
          }
          return acc;
        }, {});

        // Attach the requirement details to the message
        messages[i].requirement = Object.values(groupedRequirements)[0] || null;
      }
    }

    // Get the total number of unseen messages
    

    res.status(200).json({ 
      error: false, 
      message: "Messages fetched successfully", 
      messages: messages, 
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};





const getMessagesRoom = async (req, res) => {
  try{
    const { roomId } = req.body;

  const messages = await sequelize.query(
    'SELECT * FROM message_room WHERE roomId = ? ORDER BY createdAt ASC',
    {
      replacements: [roomId],
      type: sequelize.QueryTypes.SELECT
    }
  );

  res.status(200).json({error: false,message: "Message Fetch Successfully",messages: messages});
  }catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
}

const getAllUserPrductService = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { userId } = req.body;


    const requirments = await sequelize.query(
      'SELECT add_new_productservice.*,productservice_photo.id AS PHID,productservice_photo.photo AS RIMAGE FROM add_new_productservice LEFT JOIN productservice_photo ON add_new_productservice.id = productservice_photo.productservice_id WHERE add_new_productservice.user_id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    const groupedRequirements = requirments.reduce((acc, row) => {
      const { id, PHID, RIMAGE, ...requirementData } = row;
      if (!acc[id]) {
        acc[id] = {
          ...requirementData,
          images: [],
        };
      }
      if (PHID) {
        acc[id].images.push({ id: PHID, url: RIMAGE });
      }
      return acc;
    }, {});
    const resultArray = Object.values(groupedRequirements);

    res.status(200).json({ error: false, message: "Product Fetch", allProducts: resultArray });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error', error: true });
  }
};

const createProduct = async (req, res) => {
  try {
    const { userId, title, description, images, type } = req.body;
    const result = await sequelize.query(
      'INSERT INTO add_new_productservice (user_id,Title,Description, Type) VALUES (?,?,?,?)',
      {
        replacements: [userId, title, description, type],
        type: QueryTypes.INSERT
      }
    );

    if (result && result[0] != null) {
      const reqId = result[0];
      if (Array.isArray(images)) {

        for (let index = 0; index < images.length; index++) {
          const data = images[index];
          await sequelize.query(
            'INSERT INTO productservice_photo (	productservice_id, photo) VALUES (?, ?)',
            {
              replacements: [reqId, data],
              type: QueryTypes.INSERT
            }
          );
        }

        res.status(200).json({ message: 'product created!', error: false });
      }
    } else {
      res.status(400).json({ message: 'Data not inserted', error: true });
    }
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};

const deleteRequirement = async (req, res) => {
  try {
    const { requirementId } = req.body;
    if (!requirementId) {
      return res.status(400).json({ message: 'Requirement ID is required', error: true });
    }

    const result = await sequelize.query(
      'DELETE FROM add_new_requirement WHERE id = ?',
      {
        replacements: [requirementId],
        type: QueryTypes.DELETE,
      }
    );

    // if (result[0] === 0) {
    //   return res.status(404).json({ message: 'Requirement not found', error: true });
    // }

    res.status(200).json({ message: 'Requirement deleted successfully', error: false });
  } catch (error) {
    console.error('Error deleting requirement:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};

const updateRequirementStatus = async (req, res) => {
  try {
    const { requirementId } = req.body;
    if (!requirementId ) {
      return res.status(400).json({ message: 'Requirement ID and status are required', error: true });
    }

    const result = await sequelize.query(
      'UPDATE add_new_requirement SET Status = ? WHERE id = ?',
      {
        replacements: [1, requirementId],
        type: QueryTypes.UPDATE,
      }
    );

    if (result[0] === 0) {
      return res.status(404).json({ message: 'Requirement not found', error: true });
    }

    res.status(200).json({ message: 'Requirement status updated successfully', error: false });
  } catch (error) {
    console.error('Error updating requirement status:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};

const updateBusinessProfile = async (req, res) => {
  try {
    const { userId, business_name, email, business_type, business_category, description, profile, cover, address, homeTwon  } = req.body;

console.log(req.body);
    const existingUser = await sequelize.query(
      'SELECT * FROM business_profile WHERE user_id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    if (existingUser.length > 0) {
      await sequelize.query(
        `UPDATE business_profile 
         SET business_name = ?, email = ?, business_type = ?, business_category = ?, description = ?, profile = ?,cover = ?,address = ?,homeTwon = ?
         WHERE user_id = ?`,
        {
          replacements: [business_name, email, business_type, business_category, description, profile, cover, address, homeTwon, userId ],
          type: QueryTypes.UPDATE
        }
      );
      res.status(200).json({ error: false, message: 'Business Profile updated successfully' });
    } else {
      res.status(404).json({ error: true, message: 'Business Profile not found' });
    }
  } catch (error) {
    console.error('Error updating Business Profile:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};


const clickSellIt = async (req, res) => {
  try {
    const { user_id, requirement_user_id, requirement_id } = req.body;
    console.log(req.body);

    // Check if the requirement_id already exists
    const [existingEntry] = await sequelize.query(
      'SELECT * FROM sell_it_data WHERE requirement_id = ?',
      {
        replacements: [requirement_id],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (existingEntry) {
      return res.status(400).json({ error: true, message: "Requirement already Sell exists" });
    }

    // If the entry does not exist, insert the new entry
    await sequelize.query(
      'INSERT INTO sell_it_data (user_id, requirement_user_id, requirement_id) VALUES (?, ?, ?)',
      {
        replacements: [user_id, requirement_user_id, requirement_id],
        type: sequelize.QueryTypes.INSERT,
      }
    );

    res.status(200).json({ error: false, message: "Send success" });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};


const getClickSellIt = async (req, res) => {
  try{
    const {  	user_id, requirement_user_id } = req.body;

    const messages = await sequelize.query(
      'SELECT * FROM sell_it_data WHERE requirement_user_id = ?  AND user_id = ?',
      {
        replacements: [requirement_user_id ,user_id],
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.status(200).json({error: false,message: "Message Fetch Successfully",messages: messages});
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
}

const updateUserToken = async (req, res) => {
  try {
    const { token, userId } = req.body;

    await sequelize.query(
      'UPDATE register SET token = ? WHERE id = ?',
      {
        replacements: [token, userId],
        type: sequelize.QueryTypes.UPDATE
      }
    );

    res.json({ error: false, message: 'User token updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};


const getUserToken = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { userId } = req.body;
    const users = await sequelize.query(
      'SELECT token FROM register WHERE id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );
    res.status(200).json({ error: false, message: "User Token Fetch", UserToken: users });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error', error: true });
  }
};



const createStory = async (req, res) => {
  try {
    const {userId, profile, time} = req.body;


    const result = await sequelize.query(
      'INSERT INTO ads_photo (user_id,photo,story_time) VALUES (?, ?, ?)',
      {
        replacements: [userId,  profile, time],
        type: QueryTypes.INSERT
      }
    );
    // Generate and send OTP
    // await sendOTP(mobileNumber);
    res.status(200).json({ error: false, message: 'Stroy create successfully' });

  } catch (error) {
    res.status(500).json({ error: true, message: error });
  }
};

const getRoomUserToken = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { roomId } = req.body;

    const roomsQuery = await sequelize.query(
      'SELECT user_id FROM room_participants WHERE room_id = ?',
      {
        replacements: [roomId],
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (roomsQuery.length === 0) {
      return res.status(404).json({ error: true, message: 'No rooms found for this user' });
    }

    const roomDetails = await Promise.all(roomsQuery.map(async (room) => {
      const participantsQuery = await sequelize.query(
        'SELECT token FROM register WHERE id = ?',
        {
          replacements: [room.user_id],
          type: sequelize.QueryTypes.SELECT
        }
      );

      return {
        allUserToken: participantsQuery
      };
    }));

    res.status(200).json({ error: false, message: "User Token Fetch", roomUserToken: roomDetails });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error', error: true });
  }
};







// admin api all 
const loginUserAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [existingUser] = await sequelize.query('SELECT * FROM admin_login WHERE email = ? AND password = ?',
      { replacements: [email, password], type: QueryTypes.SELECT });

    // const [existingUserLoginWith] = await sequelize.query('SELECT type FROM register WHERE mobileNumber = ? ',
    // { replacements: [mobileNumber], type: QueryTypes.SELECT });

    if (existingUser) {

      const user = existingUser;

      const token = generateToken(user);
      const userId = user.id;
      const type = user.type;
      const status = user.status;

      return res.status(200).send({ error: false, message: 'Login success!', token: token, userId: userId, type: type, status: status });
    } else {
      return res.status(404).send({ error: true, message: 'Mobile Number not found! Sign up!' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: 'Error in login check api!',
      error
    });
  }
};




const fetchUsersForAdmin = async (req, res) => {
  try {
    // Fetch all users with type 'Business'
    const users = await sequelize.query(
      'SELECT id, name, batchYear, mobileNumber, type FROM register WHERE type = ?',
      {
        replacements: ['Business'],
        type: QueryTypes.SELECT
      }
    );

    // Initialize an array to hold the user details with profiles
    const userDetails = [];

    for (const user of users) {
      // Fetch profile data for Business type users
      const profileData = await sequelize.query(
        'SELECT * FROM business_profile WHERE user_id = ?',
        {
          replacements: [user.id],
          type: QueryTypes.SELECT
        }
      );

      // Add user and profile data to the userDetails array
      userDetails.push({
        ...user,
        profile: profileData[0] || null // Assuming profileData is an array
      });
    }

    // Send response with user details
    res.status(200).json({ error: false, users: userDetails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const fetchUserProfile = async (req, res) => {
  try {
    const { userId } = req.body; // Assuming userId is passed in the request body

    // Fetch user details
    const user = await sequelize.query(
      'SELECT id, name, batchYear, mobileNumber, type FROM register WHERE id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    if (!user || user.length === 0) {
      return res.status(404).json({ error: true, message: 'User not found' });
    }

    const userType = user[0].type;
    let profileData;

    // Fetch profile data based on user type
    if (userType === 'Business') {
      profileData = await sequelize.query(
        'SELECT * FROM business_profile WHERE user_id = ?',
        {
          replacements: [userId],
          type: QueryTypes.SELECT
        }
      );
    } else if (userType === 'Personal') {
      profileData = await sequelize.query(
        'SELECT * FROM personal_profile WHERE user_id = ?',
        {
          replacements: [userId],
          type: QueryTypes.SELECT
        }
      );
    } else {
      return res.status(400).json({ error: true, message: 'Invalid user type' });
    }

    // Add profile data to the user object
    const userDetails = {
      ...user[0],
      profile: profileData[0] || null // Assuming profileData is an array
    };

    res.status(200).json({ error: false, user: userDetails });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};


const fetchUsersForAdminPersonal = async (req, res) => {
  try {
    // Fetch all users with type 'Business'
    const users = await sequelize.query(
      'SELECT id, name, batchYear, mobileNumber, type FROM register WHERE type = ?',
      {
        replacements: ['Personal'],
        type: QueryTypes.SELECT
      }
    );

    // Initialize an array to hold the user details with profiles
    const userDetails = [];

    for (const user of users) {
      // Fetch profile data for Business type users
      const profileData = await sequelize.query(
        'SELECT * FROM business_profile WHERE user_id = ?',
        {
          replacements: [user.id],
          type: QueryTypes.SELECT
        }
      );

      // Add user and profile data to the userDetails array
      userDetails.push({
        ...user,
        profile: profileData[0] || null // Assuming profileData is an array
      });
    }

    // Send response with user details
    res.status(200).json({ error: false, users: userDetails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const fetchUserRequirements = async (req, res) => {
  try {
    const { userId } = req.body;

    // Fetch all requirements for the user where status is 1
    const requirements = await sequelize.query(
      'SELECT * FROM add_new_requirement WHERE user_id = ? ',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    if (requirements.length === 0) {
      return res.status(404).json({ message: 'No requirements found for the user', error: true });
    }

    // Fetch associated images for each requirement
    for (const requirement of requirements) {
      const images = await sequelize.query(
        'SELECT photo FROM requirment_photo WHERE requirment_id = ?',
        {
          replacements: [requirement.id],
          type: QueryTypes.SELECT
        }
      );

      requirement.images = images.map(img => img.photo);
    }

    // Count the total number of requirements where status is 1
    const requirementCount = await sequelize.query(
      'SELECT COUNT(*) AS count FROM add_new_requirement WHERE status = 1',
      {
        type: QueryTypes.SELECT
      }
    );

    res.status(200).json({ requirements, totalRequirements: requirementCount[0].count, error: false });
  } catch (error) {
    console.error('Error fetching user requirements:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};




const fetchUserRequirementsLetter = async (req, res) => {
  try {
    const { userId } = req.body;

    // Fetch all requirements for the user where the value is 'Letter'
    const requirements = await sequelize.query(
      'SELECT * FROM add_new_requirement WHERE user_id = ? AND value = ?',
      {
        replacements: [userId, 'Letter'],
        type: QueryTypes.SELECT
      }
    );

    if (requirements.length === 0) {
      return res.status(404).json({ message: 'No requirements found for the user', error: true });
    }

    // Fetch associated images for each requirement
    for (const requirement of requirements) {
      const images = await sequelize.query(
        'SELECT photo FROM requirment_photo WHERE requirment_id = ?',
        {
          replacements: [requirement.id],
          type: QueryTypes.SELECT
        }
      );

      requirement.images = images.map(img => img.photo);
    }

    res.status(200).json({ requirements, error: false });
  } catch (error) {
    console.error('Error fetching user requirements:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};




const fetchRequirementDetails = async (req, res) => {
  try {
    const { requirementId } = req.body;

    // Validate the requirement ID
    const requirement = await sequelize.query(
      'SELECT * FROM add_new_requirement WHERE id = ?',
      {
        replacements: [requirementId],
        type: QueryTypes.SELECT
      }
    );

    if (requirement.length === 0) {
      return res.status(404).json({ message: 'Requirement ID not found', error: true });
    }

    // Fetch data from sell_it_data table and the associated user name from the register table
    const sellDataWithUser = await sequelize.query(
      `SELECT sid.*, r.name as name, r.mobileNumber, r.type, r.batchYear
       FROM sell_it_data sid
       JOIN register r ON sid.user_id = r.id
       WHERE sid.requirement_id = ?`,
      {
        replacements: [requirementId],
        type: QueryTypes.SELECT
      }
    );

    // Count the total number of records in sellDataWithUser
    const sellDataCount = sellDataWithUser.length;

    // const requirementCount = await sequelize.query(
    //   'SELECT COUNT(*) AS count FROM add_new_requirement WHERE status = 1 AND user_id = ?',
    //   {
    //     type: QueryTypes.SELECT
    //   }
    // );

    res.status(200).json({
      requirement: requirement[0],
      totalRequirements: requirementCount[0].count,
      totalSellData: sellDataCount,
      sellData: sellDataWithUser,
      error: false
    });
  } catch (error) {
    console.error('Error fetching requirement details:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};







module.exports = {
  registerUser,
  getMessagesSenderRoom,
  sendMessageRoom,
  sendMessage,
  getMessages,
  getMessagesRoom,
  updateUserProfile,
  loginUser,
  getAllUsersIfFollow,
  updateUserType,
  createUserProfile,
  createBusinessProfile,
  createStory,
  createRoom,
  findRoomByUserId,
  getUserProfile,
  getImage,
  OTPVerify,
  sendPasswordOTP,
  OTPVerifyEmail,
  updatepassword,
  createRequirement,
  getAllUsers,
  getAllUserRequirements,
  getPersonalProfile,
  getBusinessProfile,
  sendFollowRequest,
  getFollowRequest,
  updateRequestStatus,
  getFollowAllUsers,
  getAllUserRequirementsUserFollo,
  createProduct,
  getAllUserPrductService,
  deleteRequirement,
  updateBusinessProfile,
  saveRequirement,
  updateRequirementStatus,
  clickSellIt,
  getClickSellIt,
  loginUserAdmin,
  fetchUsersForAdmin,
  fetchUserRequirements,
  fetchUserProfile,
  fetchRequirementDetails,
  fetchUserRequirementsLetter,
  fetchUsersForAdminPersonal,
  updateUserToken,
  getUserToken,
  getRoomUserToken,
  markMessagesAsSeen,
  getSavedRequirements
};