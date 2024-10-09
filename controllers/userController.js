const bcrypt = require('bcrypt');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middlewares/authMiddleware');
const fs = require('fs');
const path = require('path');

const otpGenerator = require('otp-generator');
const { broadcastMessage } = require('./soketController');

const nodemailer = require('nodemailer');
const { error } = require('console');
const QRCode = require('qrcode');
const multer = require('multer');

// Set up storage with multer to store images in the 'uploads' directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Create the 'uploads' directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}



const saveBase64Image = (base64String, folderPath) => {
  const matches = base64String.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string');
  }

  const ext = matches[1].split('/')[1]; // get the image extension
  const buffer = Buffer.from(matches[2], 'base64'); // decode base64 string

  const fileName = `${Date.now()}.${ext}`;
  const filePath = path.join(folderPath, fileName);

  fs.writeFileSync(filePath, buffer); // save the file to the uploads folder

  return filePath; // return the file path for saving in the database
};



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
    const { name, bCat, batchYear, yearTo, mobileNumber, reference } = req.body;

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
        'INSERT INTO register (name,bCat, batchYear, yearTo, mobileNumber, reference) VALUES (?,?, ?, ?, ?, ?)',
        {
          replacements: [name, bCat, batchYear, yearTo, mobileNumber, reference],
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


const updateUserSubscription = async (req, res) => {
  try {
    const { userId, subscriptionPlan } = req.body;

    const subscriptionStartDate = new Date();
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1); // Set end date to one year from now

    const result = await sequelize.query(
      'UPDATE register SET subscriptionPlan = ?, subscriptionStartDate = ?, subscriptionEndDate = ? WHERE id = ?',
      {
        replacements: [subscriptionPlan, subscriptionStartDate, subscriptionEndDate, userId],
        type: QueryTypes.UPDATE
      }
    );

    if (result[0] === 0) {
      return res.status(400).json({ error: true, message: 'User not found or no changes made' });
    }

    res.status(200).json({ error: false, message: 'Subscription plan updated successfully' });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
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

    userStatus = "1";

    if (type == "Business") {
      userStatus = "1";
    } else {
      userStatus = "1";
    }

    await sequelize.query(
      'UPDATE register SET type = ?,status = ? WHERE id = ?',
      {
        replacements: [type, userStatus, userId],
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
    const { userId, email, qualification, cityQualification, occupation, cityOccupation, employment, about, profile, cover, address, homeTown } = req.body;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Invalid email");
      return res.status(400).json({ error: true, message: 'Invalid email' });
    }

    // Check if user already has a profile
    const existingUser = await sequelize.query(
      'SELECT * FROM personal_profile WHERE user_id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    if (existingUser.length > 0) {
      console.log("Personal Profile already exists for user ID:", userId);
      return res.status(400).json({ error: true, message: 'Personal Profile already exists' });
    }
    let imagePathProfile = '';
    let imagePathCover = '';
    if (!profile) {
      imagePathProfile = "";
    } else {
      const imageconcateprofile = 'data:image/png;base64,' + profile;
      imagePathProfile = saveBase64Image(imageconcateprofile, 'uploads');
    }
    if (!cover) {
      imagePathCover = "";
    } else {
      const imageconcatecover = 'data:image/png;base64,' + cover;
      imagePathCover = saveBase64Image(imageconcatecover, 'uploads');
    }
    // Create new profile
    await sequelize.query(
      'INSERT INTO personal_profile (user_id, email, qualification, qAddress, occupation, oAddress, employment, about, profile, cover, address,homeTown) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      {
        replacements: [userId, email, qualification, cityQualification, occupation, cityOccupation, employment, about, profile, cover, address, homeTown],
        type: QueryTypes.INSERT
      }
    );

    // Optionally, generate and send OTP
    // await sendOTP(mobileNumber);

    console.log("Personal Profile created successfully for user ID:", userId);
    return res.status(200).json({ error: false, message: 'Personal Profile created successfully' });

  } catch (error) {
    console.error('Error creating personal profile:', error);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

const updateUserPersonalProfile = async (req, res) => {
  try {
    const { userId, email, qualification, cityQualification, occupation, cityOccupation, employment, about, profile, cover, address, homeTown } = req.body;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Invalid email");
      return res.status(400).json({ error: true, message: 'Invalid email' });
    }

    // Check if user profile exists
    const existingUser = await sequelize.query(
      'SELECT * FROM personal_profile WHERE user_id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );
    if (existingUser.length === 0) {
      console.log("Personal Profile does not exist for user ID:", userId);
      return res.status(404).json({ error: true, message: 'Personal Profile does not exist' });
    }

    console.log(profile);
    console.log("Invalid profile");
    console.log(cover);
    console.log("Invalid cover");

    let imagePathProfile = "";
    let imagePathCover = "";
    console.log(existingUser[0].profile);
    console.log(existingUser[0].cover);

    if (!profile) {
      imagePathProfile = existingUser[0].profile;
    } else {
      imagePathProfile = saveBase64Image(profile, 'uploads');
    }

    if (!cover) {
      imagePathCover = existingUser[0].cover;
    } else {
      imagePathCover = saveBase64Image(cover, 'uploads');
    }

    // Update profile
    await sequelize.query(
      'UPDATE personal_profile SET email = ?, qualification = ?, qAddress = ?, occupation = ?, oAddress = ?, employment = ?, about = ?, profile = ?, cover = ?, address = ?, homeTown = ? WHERE user_id = ?',
      {
        replacements: [email, qualification, cityQualification, occupation, cityOccupation, employment, about, imagePathProfile, imagePathCover, address, homeTown, userId],
        type: QueryTypes.UPDATE
      }
    );

    console.log("Personal Profile updated successfully for user ID:", userId);
    return res.status(200).json({ error: false, message: 'Personal Profile updated successfully' });

  } catch (error) {
    console.error('Error updating personal profile:', error);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

const createBusinessProfile = async (req, res) => {
  try {
    const { userId, business_name, email, business_type, business_category, description, profile, cover, address, address2, state, city, pinCode, homeTwon, _myList } = req.body;

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
      let imagePathProfile = '';
      let imagePathCover = '';
      if (!profile) {
        imagePathProfile = "";
      } else {
        const imageconcateprofile = 'data:image/png;base64,' + profile;
        imagePathProfile = saveBase64Image(imageconcateprofile, 'uploads');
      }
      if (!cover) {
        imagePathCover = "";
      } else {
        const imageconcatecover = 'data:image/png;base64,' + cover;
        imagePathCover = saveBase64Image(imageconcatecover, 'uploads');
      }

      const tagsList = _myList.join(',');
      const result = await sequelize.query(
        'INSERT INTO business_profile (user_id,business_name,email,business_type,business_category,description,profile,cover,address,address2,state,city,pincode,homeTwon, tagsList) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        {
          replacements: [userId, business_name, email, business_type, business_category, description, imagePathProfile, imagePathCover, address, address2, state, city, pinCode, homeTwon, tagsList],
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


const updateBusinessProfile = async (req, res) => {
  try {
    const { userId, business_name, email, business_type, business_category, description, profile, cover, address, address2, state, city, pinCode, homeTwon, _myList } = req.body;

    console.log(req.body);
    const existingUser = await sequelize.query(
      'SELECT * FROM business_profile WHERE user_id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );
    let imagePathProfile = "";
    let imagePathCover = "";

    if (existingUser.length > 0) {

      if (!profile && !cover) {
        // If both are null, use existing user's images
        imagePathProfile = existingUser[0].profile;
        imagePathCover = existingUser[0].cover;
      } else {
        // If either or both are provided, save the new images
        if (profile) {
          imagePathProfile = saveBase64Image(profile, 'uploads');
        } else {
          imagePathProfile = existingUser[0].profile; // Use existing if profile is not provided
        }

        if (cover) {
          imagePathCover = saveBase64Image(cover, 'uploads');
        } else {
          imagePathCover = existingUser[0].cover; // Use existing if cover is not provided
        }
      }
      const tagsList = _myList.join(',');

      await sequelize.query(
        `UPDATE business_profile 
         SET business_name = ?, email = ?, business_type = ?, business_category = ?, description = ?, profile = ?,cover = ?,address = ?,address2 = ?,state = ?,city = ?,pinCode = ?,homeTwon = ?,tagsList = ?
         WHERE user_id = ?`,
        {
          replacements: [business_name, email, business_type, business_category, description, imagePathProfile, imagePathCover, address, address2, state, city, pinCode, homeTwon, tagsList, userId],
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

const createRequirement = async (req, res) => {
  try {
    const { userId, title, description, BuySell, SingleMultiple, images, value } = req.body;
    const result = await sequelize.query(
      'INSERT INTO add_new_requirement (user_id,Title,Description,buy_sell,single_multi	, value) VALUES (?,?,?,?,?,?)',
      {
        replacements: [userId, title, description, BuySell, SingleMultiple, value],
        type: QueryTypes.INSERT
      }
    );

    if (result && result[0] != null) {
      const reqId = result[0];
      if (Array.isArray(images)) {

        for (let index = 0; index < images.length; index++) {
          const data = images[index];
          const imageconcate = 'data:image/png;base64,' + data;

          const imagePathProfile = saveBase64Image(imageconcate, 'uploads');
          await sequelize.query(
            'INSERT INTO requirment_photo (requirment_id, photo) VALUES (?, ?)',
            {
              replacements: [reqId, imagePathProfile],
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
      SELECT 
        add_new_requirement.*, 
        requirment_photo.id AS PHID, 
        requirment_photo.photo AS RIMAGE,
        register.name AS userName,
        register.type AS userType,
        saved_requirements.requirement_id AS savedRequirementId,
        COALESCE(business_profile.profile, personal_profile.profile) AS profile
      FROM add_new_requirement
      LEFT JOIN requirment_photo ON add_new_requirement.id = requirment_photo.requirment_id
      JOIN register ON add_new_requirement.user_id = register.id
      LEFT JOIN saved_requirements ON add_new_requirement.id = saved_requirements.requirement_id AND saved_requirements.user_id = :userId
      LEFT JOIN business_profile ON register.id = business_profile.user_id AND register.type = 'Business'
      LEFT JOIN personal_profile ON register.id = personal_profile.user_id AND register.type = 'Personal'
      WHERE add_new_requirement.user_id IN (:idArray) 
      AND add_new_requirement.user_id != :userId 
      AND add_new_requirement.value = 'Now'
      AND add_new_requirement.status = '0'
    `;


    const requirements = await sequelize.query(requirementsQuery, {
      replacements: { idArray, userId },
      type: sequelize.QueryTypes.SELECT
    });

    // Fetch sell data for each requirement and compute the user count
    for (let i = 0; i < requirements.length; i++) {
      const sellDataWithUser = await sequelize.query(
        `SELECT sid.*, r.name as name, r.mobileNumber, r.type, r.batchYear
         FROM sell_it_data sid
         JOIN register r ON sid.user_id = r.id
         WHERE sid.requirement_id = ?`,
        {
          replacements: [requirements[i].id],
          type: sequelize.QueryTypes.SELECT
        }
      );

      const ratingData = await sequelize.query(
        `SELECT COUNT(*) as total, SUM(rating) as tReview
         FROM requirement_review WHERE r_id = ?`,
        {
          replacements: [requirements[i].id],
          type: QueryTypes.SELECT,
        }
      );


      const totalReview = ratingData[0]?.total || 0;
      const totalRating = ratingData[0]?.tReview || 0;

      // Attach sell data to each requirement
      requirements[i].sellData = sellDataWithUser;
      requirements[i].totalReview = totalReview;
      requirements[i].totalRating = totalRating;
      // Compute and attach user count
      requirements[i].userCount = sellDataWithUser.length;
    }

    const groupedRequirements = requirements.reduce((acc, row) => {
      const { id, PHID, RIMAGE, userName, userType, savedRequirementId, sellData, totalReview, totalRating, userCount, ...requirementData } = row;
      if (!acc[id]) {
        acc[id] = {
          id, // Include the requirement ID here
          ...requirementData,
          userName,
          userType,
          isSaved: !!savedRequirementId,
          images: [],
          sellData: sellData || [],
          totalReview: totalReview || 0,
          totalRating: totalRating || 0, // Include sell data here
          userCount: userCount || 0, // Attach user count
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


const unFollowUser = async (req, res) => {
  try {
    const { reqId } = req.body;

    await sequelize.query(
      'DELETE FROM user_follower WHERE id = ?',
      {
        replacements: [reqId],
        type: QueryTypes.DELETE,
      }
    );

    res.json({ error: false, message: "You have unfollow this user" });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
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

    const requirements = await sequelize.query(
      'SELECT add_new_requirement.*, requirment_photo.id AS PHID, requirment_photo.photo AS RIMAGE FROM add_new_requirement LEFT JOIN requirment_photo ON add_new_requirement.id = requirment_photo.requirment_id WHERE add_new_requirement.user_id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT,
      }
    );

    for (let i = 0; i < requirements.length; i++) {
      const sellDataWithUser = await sequelize.query(
        `SELECT sid.*, r.name as name, r.mobileNumber, r.type, r.batchYear
         FROM sell_it_data sid
         JOIN register r ON sid.user_id = r.id
         WHERE sid.requirement_id = ?`,
        {
          replacements: [requirements[i].id],
          type: QueryTypes.SELECT,
        }
      );

      const ratingData = await sequelize.query(
        `SELECT COUNT(*) as total, SUM(rating) as tReview
         FROM requirement_review WHERE r_id = ?`,
        {
          replacements: [requirements[i].id],
          type: QueryTypes.SELECT,
        }
      );

      const totalReview = ratingData[0]?.total || 0;
      const totalRating = ratingData[0]?.tReview || 0;

      requirements[i].sellData = sellDataWithUser;
      requirements[i].totalReview = totalReview;
      requirements[i].totalRating = totalRating;
      requirements[i].userCount = sellDataWithUser.length;
    }

    const groupedRequirements = requirements.reduce((acc, row) => {
      const { id, PHID, RIMAGE, sellData, totalReview, totalRating, userCount, ...requirementData } = row;
      if (!acc[id]) {
        acc[id] = {
          id, // Include the requirement ID here
          ...requirementData,
          images: [],
          sellData: sellData || [],
          totalReview: totalReview || 0,
          totalRating: totalRating || 0,
          userCount: userCount || 0, // Attach user count
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
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};




const getAllUsers = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { userId } = req.body;
    const users = await sequelize.query(
      'SELECT r.*, uf.id AS FID, uf.user_id AS REQID, uf.status AS FSTATUS FROM register r LEFT JOIN user_follower uf ON (r.id = uf.user_id AND uf.follower_id = ?) OR (r.id = uf.follower_id AND uf.user_id = ?) AND uf.status != ? WHERE r.id != ? AND r.status = ?',
      {
        replacements: [userId, userId, '2', userId, '0'],
        type: QueryTypes.SELECT
      }
    );
    let userCount = 0;

    for (let i = 0; i < users.length; i++) {
      if (users[i].FSTATUS === '0') {
        userCount++;
      }

      let image, category, tagsList;
      if (users[i].type === 'Business') {
        // Fetch image from business table
        const businessImage = await sequelize.query(
          'SELECT business_category,profile,tagsList,state,city,pincode,homeTwon FROM business_profile WHERE user_id = ?',
          {
            replacements: [users[i].id],
            type: sequelize.QueryTypes.SELECT
          }
        );
        image = businessImage.length > 0 ? businessImage[0].profile : null;
        category = businessImage.length > 0 ? businessImage[0].business_category : null;
        tagsList = businessImage.length > 0 ? businessImage[0].tagsList : null;
        state = businessImage.length > 0 ? businessImage[0].state : null;
        city = businessImage.length > 0 ? businessImage[0].city : null;
        pincode = businessImage.length > 0 ? businessImage[0].pincode : null;
        homeTwon = businessImage.length > 0 ? businessImage[0].homeTwon : null;
      } else if (users[i].type === 'Personal') {
        // Fetch image from personal table
        const personalImage = await sequelize.query(
          'SELECT profile FROM personal_profile WHERE user_id = ?',
          {
            replacements: [users[i].id],
            type: sequelize.QueryTypes.SELECT
          }
        );
        image = personalImage.length > 0 ? personalImage[0].profile : null;
        category = null;
        tagsList = null;
        state = null;
        city = null;
        pincode = null;
        homeTwon = null;
      }

      users[i].image = image;
      users[i].category = category;
      users[i].tagsList = tagsList;
      users[i].state = state;
      users[i].city = city;
      users[i].pincode = pincode;
      users[i].homeTwon = homeTwon;
    }
    console.log(userCount);

    res.status(200).json({ error: false, message: "User Data Fetch", allUsers: users, userCount: userCount });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
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
      'SELECT personal_profile.*,register.name AS NAME,register.batchYear as BYEAR,register.yearTo as BYEARTO,register.mobileNumber as PHONE FROM personal_profile INNER JOIN register ON personal_profile.user_id = register.id WHERE personal_profile.user_id = ?',
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
      'SELECT business_profile.*,register.name AS NAME,register.batchYear as BYEAR,register.yearTo as BYEARTO,register.mobileNumber as PHONE,register.subscriptionPlan as subscriptionPlan, register.subscriptionEndDate as subscriptionEndDate FROM business_profile INNER JOIN register ON business_profile.user_id = register.id WHERE business_profile.user_id = ?',
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


const getRegisterCount = async (req, res) => {
  try {
    // Query to get total count of records by subscriptionPlan
    const totalFreeUsers = await sequelize.query(
      'SELECT * FROM register WHERE subscriptionPlan = ?',
      {
        replacements: ['Free'],
        type: QueryTypes.SELECT
      }
    );

    const totalGoldUsers = await sequelize.query(
      'SELECT * FROM register WHERE subscriptionPlan = ?',
      {
        replacements: ['Gold'],
        type: QueryTypes.SELECT
      }
    );

    const totalSilverUsers = await sequelize.query(
      'SELECT * FROM register WHERE subscriptionPlan = ?',
      {
        replacements: ['Silver'],
        type: QueryTypes.SELECT
      }
    );

    const totalBlankUsers = await sequelize.query(
      'SELECT * FROM register WHERE subscriptionPlan IS NULL',
      {
        type: QueryTypes.SELECT
      }
    );

    // Calculate the totals
    const FreeTotaluser = totalFreeUsers.length.toString(); // Convert count to string
    const GoldTotaluser = totalGoldUsers.length.toString();
    const SilverTotaluser = totalSilverUsers.length.toString();
    const BlankTotaluser = totalBlankUsers.length.toString();

    // Send response with counts in the desired format
    res.status(200).json({
      error: false,
      FreeTotaluser,
      GoldTotaluser,
      SilverTotaluser,
      BlankTotaluser,
    });
  } catch (error) {
    console.error('Error fetching register counts:', error);
    res.status(500).json({ error: 'Internal server error' });
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

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const totalRequests = await sequelize.query(
      'SELECT COUNT(*) as total FROM user_follower WHERE user_id = ? AND created_at >= ? AND status != ?',
      {
        replacements: [userId, oneMonthAgo, '2'],
        type: QueryTypes.SELECT
      }
    );

    console.log(totalRequests);

    const userPlan = await sequelize.query(
      'SELECT subscriptionPlan, subscriptionEndDate,type FROM register WHERE id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    if (userPlan.length === 0) {
      return res.status(404).json({ error: true, message: 'User not found' });
    }

    const subscriptionEndDate = new Date(userPlan[0].subscriptionEndDate);
    const currentDate = new Date();

    if (userPlan[0].type == "Personal") {
      if (existingUser.length === 0 && existingUser1.length === 0) {
        const result = await sequelize.query(
          'INSERT INTO user_follower (user_id,follower_id) VALUES (?, ?)',
          {
            replacements: [userId, followerId],
            type: QueryTypes.INSERT
          }
        );
        res.status(200).json({ error: false, message: 'Request send successfully' });
      } else {
        res.status(400).json({ error: true, message: 'Request already exist' });
      }
    } else {
      if (currentDate > subscriptionEndDate) {
        res.status(400).json({ error: true, message: 'Subscription is expired', isExpired: true });
      } else {

        if (userPlan[0].subscriptionPlan == "Silver") {
          if (totalRequests[0].total < 10) {
            if (existingUser.length === 0 && existingUser1.length === 0) {
              const result = await sequelize.query(
                'INSERT INTO user_follower (user_id,follower_id) VALUES (?, ?)',
                {
                  replacements: [userId, followerId],
                  type: QueryTypes.INSERT
                }
              );
              res.status(200).json({ error: false, message: 'Request send successfully' });
            } else {
              res.status(400).json({ error: true, message: 'Request already exist' });
            }
          } else {
            res.status(400).json({ error: true, message: 'Your Plan Limit Has Reached' });
          }
        } else {
          if (existingUser.length === 0 && existingUser1.length === 0) {
            const result = await sequelize.query(
              'INSERT INTO user_follower (user_id,follower_id) VALUES (?, ?)',
              {
                replacements: [userId, followerId],
                type: QueryTypes.INSERT
              }
            );
            res.status(200).json({ error: false, message: 'Request send successfully' });
          } else {
            res.status(400).json({ error: true, message: 'Request already exist' });
          }
        }
      }
    }

    // Check if the subscription is expired

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
  try {
    const { content, senderId, roomId, type } = req.body;
    console.log(req.body);

    await sequelize.query(
      'INSERT INTO message_room (senderId,roomId, content,type) VALUES (?, ?, ?, ?)',
      {
        replacements: [senderId, roomId, content, type],
        type: sequelize.QueryTypes.INSERT
      }
    );

    res.status(200).json({ error: false, message: "send success " });
  } catch (error) {
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

    // Initialize unseen messages count and last message creation time for each user
    for (let i = 0; i < users.length; i++) {
      const unseenMessagesCount = await sequelize.query(
        'SELECT COUNT(*) as count FROM message WHERE seen = false AND senderId = ? AND reciverId = ?',
        {
          replacements: [users[i].id, userId],
          type: sequelize.QueryTypes.SELECT
        }
      );

      // Get the last message creation time
      const lastMessageTime = await sequelize.query(
        `SELECT createdAt FROM message 
         WHERE (senderId = ? AND reciverId = ?) OR (senderId = ? AND reciverId = ?)
         ORDER BY createdAt DESC LIMIT 1`,
        {
          replacements: [users[i].id, userId, userId, users[i].id],
          type: sequelize.QueryTypes.SELECT
        }
      );

      let image, category;
      if (users[i].type === 'Business') {
        // Fetch image from business table
        const businessImage = await sequelize.query(
          'SELECT business_category,profile FROM business_profile WHERE user_id = ?',
          {
            replacements: [users[i].id],
            type: sequelize.QueryTypes.SELECT
          }
        );
        image = businessImage.length > 0 ? businessImage[0].profile : null;
        category = businessImage.length > 0 ? businessImage[0].business_category : null;
      } else if (users[i].type === 'Personal') {
        // Fetch image from personal table
        const personalImage = await sequelize.query(
          'SELECT profile FROM personal_profile WHERE user_id = ?',
          {
            replacements: [users[i].id],
            type: sequelize.QueryTypes.SELECT
          }
        );
        image = personalImage.length > 0 ? personalImage[0].profile : null;
        category = null;
      }

      // Add unseen message count and last message time to each user object
      users[i].unseenMessagesCount = unseenMessagesCount[0].count;
      users[i].lastMessageTime = lastMessageTime.length > 0 ? lastMessageTime[0].createdAt : null;
      users[i].image = image;
      users[i].category = category;
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
      SELECT DISTINCT rooms.id, rooms.user_id, rooms.g_name, rooms.created_at
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

    // Fetch participants and message details for each room
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

      const lastMessageTimeQuery = await sequelize.query(
        `SELECT createdAt FROM message_room 
         WHERE roomId = ?
         ORDER BY createdAt DESC LIMIT 1`,
        {
          replacements: [room.id],
          type: sequelize.QueryTypes.SELECT
        }
      );

      const lastMessageTime = lastMessageTimeQuery.length > 0 ? lastMessageTimeQuery[0].createdAt : null;

      return {
        room: {
          id: room.id,
          user_id: room.user_id,
          g_name: room.g_name,
          created_at: room.created_at,
          lastMessageTime: lastMessageTime
        },
        participants: participantsQuery
      };
    }));

    res.status(200).json({ error: false, message: "Rooms fetched successfully", roomDetails: roomDetails });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};





const sendMessage = async (req, res) => {
  try {
    const { content, senderId, receiverId, type } = req.body;
    console.log(req.body);

    await sequelize.query(
      'INSERT INTO message (senderId, reciverId, content, type) VALUES (?, ?, ?, ?)',
      {
        replacements: [senderId, receiverId, content, type],
        type: sequelize.QueryTypes.INSERT,
      }
    );

    const newMessage = { senderId, receiverId, content, type, createdAt: new Date() };
    broadcastMessage(newMessage);

    res.status(200).json({ error: false, message: "Send success" });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};

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
      } else if (messages[i].type === "profileB") {
        const userId = messages[i].content;
        const users = await sequelize.query(
          'SELECT business_profile.*,register.name AS NAME,register.batchYear as BYEAR,register.yearTo as BYEARTO,register.mobileNumber as PHONE,register.subscriptionPlan as subscriptionPlan, register.subscriptionEndDate as subscriptionEndDate FROM business_profile INNER JOIN register ON business_profile.user_id = register.id WHERE business_profile.user_id = ?',
          {
            replacements: [userId],
            type: sequelize.QueryTypes.SELECT
          }
        );
        messages[i].profile = users[0] || null;
      } else if (messages[i].type === "profileP") {
        const userId = messages[i].content; // Assuming userId is stored in content for profileP type
        const users = await sequelize.query(
          'SELECT personal_profile.*,register.name AS NAME,register.batchYear as BYEAR,register.yearTo as BYEARTO,register.mobileNumber as PHONE FROM personal_profile INNER JOIN register ON personal_profile.user_id = register.id WHERE personal_profile.user_id = ?',
          {
            replacements: [userId],
            type: sequelize.QueryTypes.SELECT
          }
        );
        messages[i].profile = users[0] || null;
      }
    }

    console.log('Final Messages:', messages); // Log final messages for debugging

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
  try {
    const { roomId } = req.body;

    const messages = await sequelize.query(
      'SELECT mr.*, r.name AS sender_name FROM message_room mr INNER JOIN register r ON mr.senderId = r.id WHERE mr.roomId = ? ORDER BY mr.createdAt DESC',
      {
        replacements: [roomId],
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.status(200).json({ error: false, message: "Message Fetch Successfully", messages: messages });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
}

const getAllUserPrductService = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { userId } = req.body;


    const requirments = await sequelize.query(
      'SELECT add_new_productservice.*, productservice_photo.id AS PHID, productservice_photo.photo AS RIMAGE FROM add_new_productservice LEFT JOIN productservice_photo ON add_new_productservice.id = productservice_photo.productservice_id WHERE add_new_productservice.user_id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    const groupedRequirements = requirments.reduce((acc, row) => {
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
    const resultArray = Object.values(groupedRequirements);

    res.status(200).json({ error: false, message: "Product Fetch", allProducts: resultArray });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error', error: true });
  }
};




const getUserStory = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { userId } = req.body;

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
      return res.status(200).json({ error: false, message: "No story found", UserStory: [] });
    }

    // Add the current user to the array, but filter their requirements below
    idArray.push(userId);

    const status = "1";
    const usersStory = await sequelize.query(
      'SELECT * FROM ads_photo WHERE user_id IN (:idArray) AND user_id != :userId AND status = :status AND NOW() <= DATE_ADD(created_at, INTERVAL CAST(story_time AS UNSIGNED) HOUR)',
      {
        replacements: { idArray, userId, status },
        type: QueryTypes.SELECT
      }
    );
    res.status(200).json({ error: false, message: "User Story Fetch", UserStory: usersStory });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error', error: true });
  }
};

const getOwnUserStory = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { userId } = req.body;
    const usersStory = await sequelize.query(
      'SELECT * FROM ads_photo WHERE user_id = ? AND NOW() <= DATE_ADD(created_at, INTERVAL CAST(story_time AS UNSIGNED) HOUR)',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );
    res.status(200).json({ error: false, message: "User Story Fetch", UserStory: usersStory });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};

const deleteUserStory = async (req, res) => {
  try {
    const { storyId } = req.body;
    if (!storyId) {
      return res.status(400).json({ message: 'Story ID is required', error: true });
    }

    const result = await sequelize.query(
      'DELETE FROM ads_photo WHERE id = ?',
      {
        replacements: [storyId],
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
    if (!requirementId) {
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




const clickSellIt = async (req, res) => {
  try {
    const { user_id, requirement_user_id, requirement_id } = req.body;
    console.log(req.body);

    // Fetch the single_multi and status of the requirement
    const [requirement] = await sequelize.query(
      'SELECT single_multi, status FROM add_new_requirement WHERE id = ?',
      {
        replacements: [requirement_id],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!requirement) {
      return res.status(404).json({ error: true, message: "Requirement not found" });
    }

    if (requirement.status === 1) {
      return res.status(400).json({ error: true, message: "Requirement already completed" });
    }

    // Check if the requirement_id already exists in sell_it_data
    const [existingEntry] = await sequelize.query(
      'SELECT * FROM sell_it_data WHERE requirement_id = ?',
      {
        replacements: [requirement_id],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (existingEntry) {
      return res.status(400).json({ error: true, message: "Requirement already  exists" });
    }

    // If the entry does not exist, insert the new entry
    await sequelize.query(
      'INSERT INTO sell_it_data (user_id, requirement_user_id, requirement_id) VALUES (?, ?, ?)',
      {
        replacements: [user_id, requirement_user_id, requirement_id],
        type: sequelize.QueryTypes.INSERT,
      }
    );

    // If the requirement is single, update its status to 1 in add_new_requirement table
    if (requirement.single_multi == 'Single') {
      await sequelize.query(
        'UPDATE add_new_requirement SET status = 1 WHERE id = ?',
        {
          replacements: [requirement_id],
          type: sequelize.QueryTypes.UPDATE,
        }
      );
    }

    res.status(200).json({ error: false, message: "Send success" });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};



const getClickSellIt = async (req, res) => {
  try {
    const { user_id, requirement_user_id } = req.body;

    const messages = await sequelize.query(
      'SELECT * FROM sell_it_data WHERE requirement_user_id = ?  AND user_id = ?',
      {
        replacements: [requirement_user_id, user_id],
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.status(200).json({ error: false, message: "Message Fetch Successfully", messages: messages });
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
    const { userId, profile, time } = req.body;

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const imageconcatecover = 'data:image/png;base64,' + profile;
    imagePathCover = saveBase64Image(imageconcatecover, 'uploads');

    const totalStory = await sequelize.query(
      'SELECT COUNT(*) as total FROM ads_photo WHERE user_id = ? AND created_at >= ? AND status = ?',
      {
        replacements: [userId, oneMonthAgo, '1'],
        type: QueryTypes.SELECT
      }
    );

    const userPlan = await sequelize.query(
      'SELECT subscriptionPlan, subscriptionEndDate FROM register WHERE id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    if (userPlan.length === 0) {
      return res.status(404).json({ error: true, message: 'User not found' });
    }

    const subscriptionEndDate = new Date(userPlan[0].subscriptionEndDate);
    const currentDate = new Date();

    if (currentDate > subscriptionEndDate) {
      res.status(400).json({ error: true, message: 'Subscription is expired', isExpired: true });
    } else {
      if (userPlan[0].subscriptionPlan == "Silver") {
        const result = await sequelize.query(
          'INSERT INTO ads_photo (user_id,photo,story_time) VALUES (?, ?, ?)',
          {
            replacements: [userId, imagePathCover, time],
            type: QueryTypes.INSERT
          }
        );
        // Generate and send OTP
        // await sendOTP(mobileNumber);
        res.status(200).json({ error: false, message: 'Stroy create successfully' });
      } else {
        if (totalStory[0].total < 5) {
          const result = await sequelize.query(
            'INSERT INTO ads_photo (user_id,photo,story_time) VALUES (?, ?, ?)',
            {
              replacements: [userId, imagePathCover, time],
              type: QueryTypes.INSERT
            }
          );
          // Generate and send OTP
          // await sendOTP(mobileNumber);
          res.status(200).json({ error: false, message: 'Stroy create successfully' });
        } else {
          res.status(400).json({ error: true, message: 'Your Plan Limit Has Reached' });
        }
      }
    }



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

// const fetchUsersForAdmin = async (req, res) => {
//   try {
//     // Get current date in YYYY-MM-DD format
//     const currentDate = new Date().toISOString().slice(0, 10);

//     // Fetch all users with type 'Business' registered on the current day
//     const users = await sequelize.query(
//       'SELECT id, name, batchYear, mobileNumber, type FROM register WHERE type = ? AND DATE(created_at) = ?',
//       {
//         replacements: ['Business', currentDate],
//         type: QueryTypes.SELECT
//       }
//     );

//     // Initialize an array to hold the user details with profiles
//     const userDetails = [];

//     for (const user of users) {
//       // Fetch profile data for Business type users
//       const profileData = await sequelize.query(
//         'SELECT * FROM business_profile WHERE user_id = ?',
//         {
//           replacements: [user.id],
//           type: QueryTypes.SELECT
//         }
//       );

//       // Add user and profile data to the userDetails array
//       userDetails.push({
//         ...user,
//         profile: profileData[0] || null // Assuming profileData is an array
//       });
//     }

//     // Count total number of users registered on the current day
//     const totalUsers = users.length;

//     // Send response with user details, total count, and current date
//     res.status(200).json({ error: false, currentDate, totalUsers, users: userDetails });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };
const fetchUsersForAdmin = async (req, res) => {
  try {
    // Fetch all users with type 'Business'
    const users = await sequelize.query(
      'SELECT * FROM register WHERE type = ?',
      {
        replacements: ['Business'],
        type: QueryTypes.SELECT
      }
    );

    // Initialize an array to hold the user details with profiles
    const userDetails = [];

    const currentDate = new Date().toISOString().slice(0, 10);

    // Fetch all users with type 'Business' registered on the current day
    const usersCurrentDate = await sequelize.query(
      'SELECT * FROM register WHERE type = ? AND DATE(created_at) = ?',
      {
        replacements: ['Business', currentDate],
        type: QueryTypes.SELECT
      }
    );



    for (const user of users) {
      // Fetch profile data for Business type users
      const profileData = await sequelize.query(
        'SELECT * FROM business_profile WHERE user_id = ?',
        {
          replacements: [user.id],
          type: QueryTypes.SELECT
        }
      );

      const checkStoryStatus = await sequelize.query(
        'SELECT * FROM ads_photo WHERE user_id = ? AND status = ?',
        {
          replacements: [user.id, '0'],
          type: QueryTypes.SELECT
        }
      );

      var storyStatus = 0;

      if (checkStoryStatus.length > 0) {
        storyStatus = 0;
      } else {
        storyStatus = 1;
      }
      // Add user and profile data to the userDetails array
      userDetails.push({
        ...user,
        profile: profileData[0] || null,
        storyStatus: storyStatus,
      });
    }


    const topUsers = await sequelize.query(
      `SELECT user_id, COUNT(*) as completedCount
       FROM add_new_requirement
       WHERE status = ?
       GROUP BY user_id
       ORDER BY completedCount DESC
       LIMIT 3`,
      {
        replacements: ['1'],
        type: QueryTypes.SELECT
      }
    );

    // Fetch user details for the top users
    const userDetailsPromises = topUsers.map(async (user) => {
      const userDetail = await sequelize.query(
        'SELECT id, name, batchYear, mobileNumber, type FROM register WHERE id = ?',
        {
          replacements: [user.user_id],
          type: QueryTypes.SELECT
        }
      );
      return {
        ...userDetail[0],
        completedCount: user.completedCount
      };
    });

    const userComplatedReq = await Promise.all(userDetailsPromises);

    // Count total number of users
    const totalUsers = users.length;
    const totalUsersCurrentDate = usersCurrentDate.length;


    // Send response with user details and total count
    res.status(200).json({ error: false, totalUsers, topUsers: userComplatedReq, totalUsersCurrentDate, users: userDetails });
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
      'SELECT id, name, bCat, batchYear,yearTo, reference, mobileNumber,subscriptionPlan,subscriptionStartDate,subscriptionEndDate, type,status FROM register WHERE id = ?',
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
      'SELECT id, name, batchYear, mobileNumber,status, type FROM register WHERE type = ?',
      {
        replacements: ['Personal'],
        type: QueryTypes.SELECT
      }
    );

    // Initialize an array to hold the user details with profiles
    const userDetails = [];

    const currentDate = new Date().toISOString().slice(0, 10);

    // Fetch all users with type 'Business' registered on the current day
    const usersCurrentDate = await sequelize.query(
      'SELECT id, name, batchYear, mobileNumber, type FROM register WHERE type = ? AND DATE(created_at) = ?',
      {
        replacements: ['Personal', currentDate],
        type: QueryTypes.SELECT
      }
    );

    const usersTotalCurrentDate = await sequelize.query(
      'SELECT * FROM register WHERE DATE(created_at) = ?',
      {
        replacements: [currentDate],
        type: QueryTypes.SELECT
      }
    );

    const usersTotal = await sequelize.query(
      'SELECT * FROM register ',
      {
        type: QueryTypes.SELECT
      }
    );



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

    const totalUsers = users.length;
    const totalUsersCurrentDate = usersCurrentDate.length;
    const TotalUserToday = usersTotalCurrentDate.length;
    const TotalUser = usersTotal.length;

    // Send response with user details
    res.status(200).json({ error: false, totalUsers, totalUsersCurrentDate, TotalUserToday, TotalUser, users: userDetails });
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

    const { userId } = req.body;



    const requirements = await sequelize.query(

      'SELECT add_new_requirement.*, requirment_photo.id AS PHID, requirment_photo.photo AS RIMAGE FROM add_new_requirement LEFT JOIN requirment_photo ON add_new_requirement.id = requirment_photo.requirment_id WHERE add_new_requirement.id = ?',

      {

        replacements: [userId],

        type: QueryTypes.SELECT,

      }

    );



    for (let i = 0; i < requirements.length; i++) {

      const sellDataWithUser = await sequelize.query(

        `SELECT sid.*, r.name as name, r.mobileNumber, r.type, r.batchYear

         FROM sell_it_data sid

         JOIN register r ON sid.user_id = r.id

         WHERE sid.requirement_id = ?`,

        {

          replacements: [requirements[i].id],

          type: QueryTypes.SELECT,

        }

      );



      const ratingData = await sequelize.query(

        `SELECT COUNT(*) as total, SUM(rating) as tReview

         FROM requirement_review WHERE r_id = ?`,

        {

          replacements: [requirements[i].id],

          type: QueryTypes.SELECT,

        }

      );



      const totalReview = ratingData[0]?.total || 0;

      const totalRating = ratingData[0]?.tReview || 0;



      requirements[i].sellData = sellDataWithUser;

      requirements[i].totalReview = totalReview;

      requirements[i].totalRating = totalRating;

      requirements[i].userCount = sellDataWithUser.length;

    }



    const groupedRequirements = requirements.reduce((acc, row) => {

      const { id, PHID, RIMAGE, sellData, totalReview, totalRating, userCount, ...requirementData } = row;

      if (!acc[id]) {

        acc[id] = {

          id, // Include the requirement ID here

          ...requirementData,

          images: [],

          sellData: sellData || [],

          totalReview: totalReview || 0,

          totalRating: totalRating || 0,

          userCount: userCount || 0, // Attach user count

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

    res.status(500).json({ message: 'Internal server error', error: true });

  }

};

const fetchUsersTotalCountAll = async (req, res) => {
  try {
    const currentDate = new Date().toISOString().slice(0, 10);
    const totalRequirements = await sequelize.query(
      'SELECT * FROM add_new_requirement ',
      {
        type: QueryTypes.SELECT
      }
    );

    const totalRequirementsToday = await sequelize.query(
      'SELECT * FROM add_new_requirement WHERE  createdAt = ?',
      {
        replacements: [currentDate],
        type: QueryTypes.SELECT
      }
    );

    const totalRequirementsComplated = await sequelize.query(
      'SELECT * FROM add_new_requirement WHERE status = ?',
      {
        replacements: ['1'],
        type: QueryTypes.SELECT
      }
    );


    const totalRequirementsComplatedToday = await sequelize.query(
      'SELECT * FROM add_new_requirement WHERE  status = ? AND  createdAt = ?',
      {
        replacements: ['1', currentDate],
        type: QueryTypes.SELECT
      }
    );

    const totalRequirementsLetter = await sequelize.query(
      'SELECT * FROM add_new_requirement WHERE value = ?',
      {
        replacements: ['Letter'],
        type: QueryTypes.SELECT
      }
    );

    const totalServicesToday = await sequelize.query(
      'SELECT * FROM add_new_productservice WHERE Type = ? AND  createdAt = ?',
      {
        replacements: ['Service', currentDate],
        type: QueryTypes.SELECT
      }
    );

    const totalServices = await sequelize.query(
      'SELECT * FROM add_new_productservice WHERE Type = ?',
      {
        replacements: ['Service'],
        type: QueryTypes.SELECT
      }
    );

    const totalProducts = await sequelize.query(
      'SELECT * FROM add_new_productservice WHERE  Type = ? ',
      {
        replacements: ['Product'],
        type: QueryTypes.SELECT
      }
    );

    const totalProductsToday = await sequelize.query(
      'SELECT * FROM add_new_productservice WHERE  status = ? AND  createdAt = ?',
      {
        replacements: ['Product', currentDate],
        type: QueryTypes.SELECT
      }
    );

    const totalRequirement = totalRequirements.length;
    const totalRequirementToday = totalRequirementsToday.length;
    const totalRequirementComplated = totalRequirementsComplated.length;
    const totalRequirementComplatedToday = totalRequirementsComplatedToday.length;
    const totalRequirementLetter = totalRequirementsLetter.length;
    const totalService = totalServices.length;
    const totalServiceToday = totalServicesToday.length;
    const totalProduct = totalProducts.length;
    const totalProductToday = totalProductsToday.length;

    // Send response with user details
    res.status(200).json({ error: false, totalService, totalServiceToday, totalProduct, totalProductToday, totalRequirement, totalRequirementToday, totalRequirementComplated, totalRequirementComplatedToday, totalRequirementLetter, });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const fetchTopUsersWithCompletedRequirements = async (req, res) => {
  try {
    // Fetch top three users who have completed the highest number of requirements
    const topUsers = await sequelize.query(
      `SELECT user_id, COUNT(*) as completedCount
       FROM add_new_requirement
       WHERE status = ?
       GROUP BY user_id
       ORDER BY completedCount DESC
       LIMIT 3`,
      {
        replacements: ['1'],
        type: QueryTypes.SELECT
      }
    );

    // Fetch user details for the top users
    const userDetailsPromises = topUsers.map(async (user) => {
      const userDetail = await sequelize.query(
        'SELECT id, name, batchYear, mobileNumber, type FROM register WHERE id = ?',
        {
          replacements: [user.user_id],
          type: QueryTypes.SELECT
        }
      );
      return {
        ...userDetail[0],
        completedCount: user.completedCount
      };
    });

    const userDetails = await Promise.all(userDetailsPromises);

    // Send response with the top users and their completed requirements count
    res.status(200).json({ error: false, topUsers: userDetails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const getUserPlan = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { userId } = req.body;
    const users = await sequelize.query(
      'SELECT subscriptionPlan, status FROM register WHERE id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    console.log(users);
    res.status(200).json({ error: false, message: "User Plan Fetch", UserPlan: users });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error', error: true });
  }
};



const verifyBusinessProfile = async (req, res) => {
  try {
    const { userId, status } = req.body;
    await sequelize.query(
      'UPDATE register SET status = ? WHERE id = ?',
      {
        replacements: [status, userId],
        type: sequelize.QueryTypes.UPDATE
      }
    );

    res.json({ error: false, message: 'Business Verified successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

const getUserStorybyId = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { userId } = req.body;
    const users = await sequelize.query(
      'SELECT * FROM ads_photo WHERE user_id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );
    res.status(200).json({ error: false, message: "User Story Fetch", UserStory: users });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error', error: true });
  }
};

const verifyStory = async (req, res) => {
  try {
    const { storyId, status } = req.body;
    await sequelize.query(
      'UPDATE ads_photo SET status = ? WHERE id = ?',
      {
        replacements: [status, storyId],
        type: sequelize.QueryTypes.UPDATE
      }
    );

    res.json({ error: false, message: 'Business Story Verified successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

const updateGroupName = async (req, res) => {
  try {
    const { roomId, userId, name } = req.body;
    await sequelize.query(
      'UPDATE rooms SET g_name = ? WHERE id = ? AND user_id = ?',
      {
        replacements: [name, roomId, userId],
        type: sequelize.QueryTypes.UPDATE
      }
    );

    res.json({ error: false, message: 'Group Nane Updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: true, message: 'Group Name Only Updated By Admin' });
  }
};


const updateUserName = async (req, res) => {
  try {
    const { userId, name, batchYear, yearTo } = req.body;

    // Check if all required fields are provided
    if (userId === undefined || name === undefined || batchYear === undefined || yearTo === undefined) {
      return res.status(400).json({ error: true, message: 'All fields are required' });
    }

    // Log the values to confirm they are as expected
    console.log('Request Body:', req.body);

    // Execute the update query
    await sequelize.query(
      'UPDATE register SET name = ?, batchYear = ?, yearTo = ? WHERE id = ?',
      {
        replacements: [name, batchYear, yearTo, userId],
        type: QueryTypes.UPDATE
      }
    );

    res.json({ error: false, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: true, message: 'Profile not updated' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { userId, title, description, images, type } = req.body;

    const totalProducts = await sequelize.query(
      'SELECT COUNT(*) as total FROM add_new_productservice WHERE user_id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    const userPlan = await sequelize.query(
      'SELECT subscriptionPlan, subscriptionEndDate FROM register WHERE id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    if (userPlan.length === 0) {
      return res.status(404).json({ error: true, message: 'User not found' });
    }

    const subscriptionEndDate = new Date(userPlan[0].subscriptionEndDate);
    const currentDate = new Date();

    // Check if the subscription is expired
    if (currentDate > subscriptionEndDate) {
      res.status(400).json({ error: true, message: 'Subscription is expired', isExpired: true });
    } else {
      if (userPlan[0].subscriptionPlan == "Silver") {
        if (totalProducts[0].total < 5) {
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
        } else {
          res.status(400).json({ error: true, message: 'Your Plan Limit Has Reached' });
        }
      } else {
        if (totalProducts[0].total < 25) {
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
        } else {
          res.status(400).json({ error: true, message: 'Your Plan Limit Has Reached' });
        }
      }
    }
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};

const updateProductService = async (req, res) => {
  try {
    const { productId, title, description, images, Type } = req.body;

    console.log(req.body);

    // Update the main requirement details
    const updateResult = await sequelize.query(
      'UPDATE add_new_productservice SET Title = ?, Description = ?, Type = ? WHERE id = ?',
      {
        replacements: [title, description, Type, productId],
        type: QueryTypes.UPDATE
      }
    );

    // Check if the update was successful
    if (Array.isArray(images) && images.length > 0) {
      // Delete existing photos for the requirement
      await sequelize.query(
        'DELETE FROM productservice_photo WHERE productservice_id = ?',
        {
          replacements: [productId],
          type: QueryTypes.DELETE
        }
      );

      // Insert new photos for the requirement
      for (let index = 0; index < images.length; index++) {
        const data = images[index];
        await sequelize.query(
          'INSERT INTO productservice_photo (productservice_id, photo) VALUES (?, ?)',
          {
            replacements: [productId, data],
            type: QueryTypes.INSERT
          }
        );
      }
    }
    res.status(200).json({ message: 'Requirement updated successfully!', error: false });
  } catch (error) {
    console.error('Error updating Requirement:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};


const deleteImageProductService = async (req, res) => {
  try {
    const { imageId } = req.body;

    // Delete the image from the requirment_photo table
    const deleteResult = await sequelize.query(
      'DELETE FROM productservice_photo WHERE id = ?',
      {
        replacements: [imageId],
        type: QueryTypes.DELETE
      }
    );

    // Check if the deletion was successful
    res.status(200).json({ message: 'Image deleted successfully!', error: false });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};


const deleteImage = async (req, res) => {
  try {
    const { imageId } = req.body;

    // Delete the image from the requirment_photo table
    const deleteResult = await sequelize.query(
      'DELETE FROM requirment_photo WHERE id = ?',
      {
        replacements: [imageId],
        type: QueryTypes.DELETE
      }
    );

    // Check if the deletion was successful
    res.status(200).json({ message: 'Image deleted successfully!', error: false });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};



const updateRequirement = async (req, res) => {
  try {
    const { requirementId, title, description, images, value } = req.body;


    console.log(req.body);

    // Update the main requirement details
    const updateResult = await sequelize.query(
      'UPDATE add_new_requirement SET Title = ?, Description = ?, value = ? WHERE id = ?',
      {
        replacements: [title, description, value, requirementId],
        type: QueryTypes.UPDATE
      }
    );

    if (Array.isArray(images)) {
      // Delete existing photos for the requirement
      await sequelize.query(
        'DELETE FROM requirment_photo WHERE requirment_id = ?',
        {
          replacements: [requirementId],
          type: QueryTypes.DELETE
        }
      );

      // Insert new photos for the requirement
      for (let index = 0; index < images.length; index++) {
        const data = images[index];
        let imagePathProfile = '';

        if (data.includes('uploads')) {

          imagePathProfile = data;

        } else {

          const imageconcate = 'data:image/png;base64,' + data;

          imagePathProfile = saveBase64Image(imageconcate, 'uploads');

        }
        await sequelize.query(
          'INSERT INTO requirment_photo (requirment_id, photo) VALUES (?, ?)',
          {
            replacements: [requirementId, imagePathProfile],
            type: QueryTypes.INSERT
          }
        );
      }
    }

    res.status(200).json({ message: 'Requirement updated successfully!', error: false });
    // } else {
    //   res.status(404).json({ message: 'Requirement not found or could not be updated', error: true });
    // }
  } catch (error) {
    console.error('Error updating Requirement:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};

const addReviews = async (req, res) => {
  try {
    const { user_id, requirement_id, review, rating } = req.body;
    console.log(req.body);

    // Check if the requirement_id already exists
    const [existingEntry] = await sequelize.query(
      'SELECT * FROM requirement_review WHERE r_id = ? AND u_id = ?',
      {
        replacements: [requirement_id, user_id],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (existingEntry) {
      return res.status(400).json({ error: true, message: "Review already added" });
    }

    // If the entry does not exist, insert the new entry
    await sequelize.query(
      'INSERT INTO requirement_review (r_id, u_id, review,rating) VALUES (?, ?, ?, ?)',
      {
        replacements: [requirement_id, user_id, review, rating],
        type: sequelize.QueryTypes.INSERT,
      }
    );

    res.status(200).json({ error: false, message: "Review added" });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};

const getUserReviews = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { rId } = req.body;
    const users = await sequelize.query(
      'SELECT requirement_review.*,register.name AS UNAME,register.type AS UTYPE FROM requirement_review INNER JOIN register ON register.id = requirement_review.u_id WHERE requirement_review.r_id = ?',
      {
        replacements: [rId],
        type: QueryTypes.SELECT
      }
    );
    res.status(200).json({ error: false, message: "Reviews found", UserReviews: users });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error', error: true });
  }
};


const generateQRCode = async (req, res) => {
  try {
    const { website, tableNumber } = req.body;

    if (!website || !tableNumber) {
      return res.status(400).json({ error: true, message: 'Website and table number are required' });
    }

    const qrData = `${website}?table=${tableNumber}`;

    QRCode.toDataURL(qrData, (err, qrCode) => {
      if (err) {
        console.error('Error generating QR code:', err);
        return res.status(500).json({ error: true, message: 'Error generating QR code' });
      }

      res.status(201).json({ error: false, message: 'QR code generated successfully', qrCode });
    });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

const addCareer = async (req, res) => {
  try {
    const { userId, name, mobile, resume } = req.body;
    console.log(req.body);

    // await sequelize.query("SET SESSION max_allowed_packet=67108864");

    await sequelize.query(
      'INSERT INTO career (user_id, name, mobile,resume) VALUES (?, ?, ?, ?)',
      {
        replacements: [userId, name, mobile, resume],
        type: sequelize.QueryTypes.INSERT,
      }
    );

    res.status(200).json({ error: false, message: "Add successfully" });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
}


const getAllUsersTest = async (req, res) => {
  try {
    const { userId, limit, offset } = req.body;

    // Ensure limit and offset are numbers
    const limitValue = parseInt(limit, 10) || 10; // default to 10 if not provided
    const offsetValue = parseInt(offset, 10) || 0; // default to 0 if not provided

    const users = await sequelize.query(
      `SELECT r.*, uf.id AS FID, uf.user_id AS REQID, uf.status AS FSTATUS 
       FROM register r 
       LEFT JOIN user_follower uf 
       ON (r.id = uf.user_id AND uf.follower_id = ?) 
       OR (r.id = uf.follower_id AND uf.user_id = ?) 
       AND r.status = ? 
       AND uf.status != ? 
       WHERE r.id != ? 
       LIMIT ? OFFSET ?`,
      {
        replacements: [userId, userId, '0', '2', userId, limitValue, offsetValue],
        type: QueryTypes.SELECT
      }
    );

    let userCount = 0;

    for (let i = 0; i < users.length; i++) {
      if (users[i].FSTATUS === '0') {
        userCount++;
      }

      let image, category, tagsList, state, city, pincode, homeTwon;
      if (users[i].type === 'Business') {
        // Fetch image from business table
        const businessImage = await sequelize.query(
          'SELECT business_category, profile, tagsList, state, city, pincode, homeTwon FROM business_profile WHERE user_id = ?',
          {
            replacements: [users[i].id],
            type: QueryTypes.SELECT
          }
        );
        image = businessImage.length > 0 ? businessImage[0].profile : null;
        category = businessImage.length > 0 ? businessImage[0].business_category : null;
        tagsList = businessImage.length > 0 ? businessImage[0].tagsList : null;
        state = businessImage.length > 0 ? businessImage[0].state : null;
        city = businessImage.length > 0 ? businessImage[0].city : null;
        pincode = businessImage.length > 0 ? businessImage[0].pincode : null;
        homeTwon = businessImage.length > 0 ? businessImage[0].homeTwon : null;
      } else if (users[i].type === 'Personal') {
        // Fetch image from personal table
        const personalImage = await sequelize.query(
          'SELECT profile FROM personal_profile WHERE user_id = ?',
          {
            replacements: [users[i].id],
            type: QueryTypes.SELECT
          }
        );
        image = personalImage.length > 0 ? personalImage[0].profile : null;
        category = null;
        tagsList = null;
        state = null;
        city = null;
        pincode = null;
        homeTwon = null;
      }

      users[i].image = image;
      users[i].category = category;
      users[i].tagsList = tagsList;
      users[i].state = state;
      users[i].city = city;
      users[i].pincode = pincode;
      users[i].homeTwon = homeTwon;
    }

    console.log(userCount);
    res.status(200).json({ error: false, message: "User Data Fetch", allUsers: users, userCount: userCount });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};


const deleteAccount = async (req, res) => {
  try {
    // Extract the userId from the request body
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: true, message: 'User ID is required' });
    }

    // Check if the user exists and get the account type (Personal or Business)
    const user = await sequelize.query(
      'SELECT * FROM register WHERE id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );

    if (user.length === 0) {
      return res.status(404).json({ error: true, message: 'User not found' });
    }

    const accountType = user[0].type; // Assumes the `type` column holds the account type (Personal or Business)

    // Delete from personal or business account based on account type
    if (accountType === 'Personal') {
      await sequelize.query(
        'DELETE FROM personal_profile WHERE user_id = ?',
        {
          replacements: [userId],
          type: QueryTypes.DELETE
        }
      );
    } else if (accountType === 'Business') {
      await sequelize.query(
        'DELETE FROM business_profile WHERE user_id = ?',
        {
          replacements: [userId],
          type: QueryTypes.DELETE
        }
      );
    }

    // Delete the user from the register table
    await sequelize.query(
      'DELETE FROM register WHERE id = ?',
      {
        replacements: [userId],
        type: QueryTypes.DELETE
      }
    );

    // Return success message
    res.status(200).json({
      error: false,
      message: 'User account and associated records deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

module.exports = {
  registerUser,
  getMessagesSenderRoom,
  sendMessageRoom,
  generateQRCode,
  sendMessage,
  getMessages,
  getMessagesRoom,
  updateGroupName,
  updateUserProfile,
  updateUserPersonalProfile,
  updateUserName,
  loginUser,
  getAllUsersIfFollow,
  deleteImageProductService,
  updateRequirement,
  updateUserType,
  createUserProfile,
  getAllUsersTest,
  createBusinessProfile,
  createStory,
  createRoom,
  findRoomByUserId,
  getUserProfile,
  getImage,
  OTPVerify,
  sendPasswordOTP,
  deleteImage,
  OTPVerifyEmail,
  updatepassword,
  createRequirement,
  getRegisterCount,
  getAllUsers,
  getAllUserRequirements,
  getPersonalProfile,
  getBusinessProfile,
  sendFollowRequest,
  getFollowRequest,
  updateRequestStatus,
  updateProductService,
  getFollowAllUsers,
  getAllUserRequirementsUserFollo,
  createProduct,
  getAllUserPrductService,
  deleteRequirement,
  fetchUsersTotalCountAll,
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
  fetchTopUsersWithCompletedRequirements,
  updateUserToken,
  getUserToken,
  updateUserSubscription,
  getUserStory,
  getRoomUserToken,
  markMessagesAsSeen,
  getSavedRequirements,
  getUserPlan,
  verifyBusinessProfile,
  verifyStory,
  getUserStorybyId,
  addReviews,
  getUserReviews,
  getOwnUserStory,
  deleteUserStory,
  addCareer,
  deleteAccount,
  unFollowUser
};
