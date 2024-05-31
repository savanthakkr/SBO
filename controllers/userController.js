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
      res.status(400).json({ error: true,message: 'Invalid mobile number' });
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
      res.status(200).json({ error: false,message: 'User registered successfully',userId:userId });
    } else {
      res.status(400).json({ error: true,message: 'Mobile number already registered' });
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
    const { type,userId } = req.body;

    await sequelize.query(
      'UPDATE register SET type = ? WHERE id = ?',
      {
        replacements: [type, userId],
        type: sequelize.QueryTypes.UPDATE
      }
    );

    res.json({ error: false,message: 'User type updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: true,message: 'Internal server error' });
  }
};

const createUserProfile = async (req, res) => {
  try {
    const { userId, email, qualification,occupation,employment,about } = req.body;

    // Validate mobile number
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Invalid email");
      res.status(400).json({ error: true,message: 'Invalid email' });
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
        'INSERT INTO personal_profile (user_id,email,qualification,occupation,employment,about) VALUES (?, ?, ?, ?, ?, ?)',
        {
          replacements: [userId, email, qualification,occupation,employment,about],
          type: QueryTypes.INSERT
        }
      );
      // Generate and send OTP
      // await sendOTP(mobileNumber);
      res.status(200).json({ error: false,message: 'Personal Profile create successfully' });
    } else {
      res.status(400).json({ error: true,message: 'Personal Profile is already exist' });
    }
  } catch (error) {
    res.status(500).json({ error: true,message: error });
  }
};

const createBusinessProfile = async (req, res) => {
  try {
    const { userId,business_name, email, business_type,business_category,description } = req.body;

    // Validate mobile number
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Invalid email");
      res.status(400).json({ error: true,message: 'Invalid email' });
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
        'INSERT INTO business_profile (user_id,business_name,email,business_type,business_category,description) VALUES (?, ?, ?, ?, ?, ?)',
        {
          replacements: [userId,business_name, email, business_type,business_category,description],
          type: QueryTypes.INSERT
        }
      );
      // Generate and send OTP
      // await sendOTP(mobileNumber);
      res.status(200).json({ error: false,message: 'Business Profile create successfully' });
    } else {
      res.status(400).json({ error: true,message: 'Business Profile is already exist' });
    }
  } catch (error) {
    res.status(500).json({ error: true,message: error });
  }
};

const createRequirement = async (req, res) => {
  try {
    const { userId,title, description,images } = req.body;
    const result = await sequelize.query(
      'INSERT INTO add_new_requirement (user_id,Title,Description) VALUES (?,?,?)',
      {
        replacements: [userId, title, description],
        type: QueryTypes.INSERT
      }
    );

    if(result && result[0] != null){
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
    res.status(500).json({ message: 'Internal server error',error: true });
  }
};

const getAllUserRequirementsUserFollo = async (req, res) => {
  try {
    const { userId } = req.body;

    const users = await sequelize.query(
      `SELECT id FROM register
      WHERE id!= :userId
      AND (id IN (SELECT  user_id FROM user_follower WHERE follower_id  = :userId AND status = '0')
           OR id IN (SELECT  follower_id  FROM user_follower WHERE user_id = :userId AND status = '0'))`,
      {
        replacements: { userId: req.body.userId },
        type: sequelize.QueryTypes.SELECT
      }
    );

    const idArray = users.map(user => user.id);
    idArray.push(userId);

    console.log(idArray);

    const requirementsQuery = `
      SELECT add_new_requirement.*, requirment_photo.id AS PHID, requirment_photo.photo AS RIMAGE
      FROM add_new_requirement
      LEFT JOIN requirment_photo ON add_new_requirement.id = requirment_photo.requirment_id
      WHERE add_new_requirement.user_id IN (:idArray)
    `;

    const requirements = await sequelize.query(requirementsQuery, {
      replacements: { idArray },
      type: QueryTypes.SELECT
    });

    const groupedRequirements = requirements.reduce((acc, row) => {
      const { id, PHID, RIMAGE,...requirementData } = row;
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

    res.status(200).json({ error: false, message: "Requirment Fetch", allRequirements: resultArray });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal server error', error: true });
  }
};

const getAllUserRequirements = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { userId } = req.body;

    
    const requirments = await sequelize.query(
      'SELECT add_new_requirement.*,requirment_photo.id AS PHID,requirment_photo.photo AS RIMAGE FROM add_new_requirement LEFT JOIN requirment_photo ON add_new_requirement.id = requirment_photo.requirment_id WHERE add_new_requirement.user_id = ?',
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

    res.status(200).json({error: false,message : "Requirment Fetch",allRequirment : resultArray});
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error',error:true });
  }
};

const getAllUsers = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { userId } = req.body;
    const users = await sequelize.query(
      'SELECT r.*,uf.id AS FID,uf.user_id AS REQID,uf.status AS FSTATUS FROM register r LEFT JOIN user_follower uf ON (r.id = uf.user_id AND uf.follower_id = ?) OR (r.id = uf.follower_id AND uf.user_id = ?) AND uf.status != ? WHERE r.id != ?',
      {
        replacements: [userId,userId,'2',userId],
        type: QueryTypes.SELECT
      }
    );
    res.status(200).json({error: false,message : "User Data Fetch",allUsers : users});
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error',error:true });
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

    res.status(200).json({error: false,message : "User Data Fetch",allUsers : usersWithFollowers});
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error',error:true });
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
    res.status(200).json({error: false,message : "User Data Fetch",personalProfile : users});
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error',error:true });
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
    res.status(200).json({error: false,message : "User Data Fetch",businessProfile : users});
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error',error:true });
  }
};

const sendFollowRequest = async (req, res) => {
  try {
    const { userId, followerId } = req.body;

    const existingUser = await sequelize.query(
      'SELECT * FROM user_follower WHERE user_id = ? AND follower_id = ? AND status != ?',
      {
        replacements: [userId,followerId,'2'],
        type: QueryTypes.SELECT
      }
    );

    const existingUser1 = await sequelize.query(
      'SELECT * FROM user_follower WHERE user_id = ? AND follower_id = ? AND status != ?',
      {
        replacements: [followerId,userId,'2'],
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
      res.status(200).json({ error: false,message: 'Request send successfully' });
    } else {
      res.status(400).json({ error: true,message: 'Request already exist' });
    }
  } catch (error) {
    res.status(500).json({ error: true,message: error });
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
    res.status(200).json({error: false,message : "Follow Request Fetch",followRequest : users});
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error',error:true });
  }
};

const updateRequestStatus = async (req, res) => {
  try {
    const { reqId,status } = req.body;

    await sequelize.query(
      'UPDATE user_follower SET status = ? WHERE id = ?',
      {
        replacements: [status, reqId],
        type: sequelize.QueryTypes.UPDATE
      }
    );

    var msg = "";
    if(status == "0"){
      msg = "Accept request successfully";
    } else {
      msg = "Reject request successfully";
    }

    res.json({ error: false,message: msg });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: true,message: 'Internal server error' });
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

      return res.status(200).send({error: false,message: 'Login success!', token: token, userId: userId,type: type,status: status});
    } else {
      return res.status(404).send({error : true,message: 'Mobile Number not found! Sign up!' });
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








const googleLogin = async (req, res) => {
  
  const [existingUser] = await sequelize.query('SELECT * FROM users WHERE email = ? ',
    { replacements: [req.user.email], type: QueryTypes.SELECT });

    if (!existingUser) {
      const result = await sequelize.query(
        'INSERT INTO users (email, name, password, loginType) VALUES (?, ?, ?, ?)',
        {
          replacements: [req.user.email, req.user.name, null, 'google'],
          type: QueryTypes.INSERT
        }
      );
      res.redirect('http://localhost:3000');
    } else if(existingUser){


      const [existingUserLoginWith] = await sequelize.query('SELECT loginType FROM users WHERE email = ? ',
      { replacements: [req.user.email], type: QueryTypes.SELECT });

      console.log(existingUserLoginWith.loginType);

      if(existingUserLoginWith.loginType == 'google'){
        const token = generateToken(existingUser);
        console.log(token);
        res.cookie("token", token);
        const decoded = jwt.verify(token, 'crud');
        console.log(decoded);
        
        console.log(existingUser.id);
        console.log("user login with google" , token);
        res.redirect('http://localhost:3000/allPost');
        
      }else{
        console.log("user not login with google");
      }
      

    }else{
      res.message('faileld');
    }

}





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
  const { content } = req.body;
  const receiverId = req.params.id;
  console.log(receiverId);
  const senderId = req.user.id;

  await sequelize.query(
    'INSERT INTO group_chat (user_id, room_id, created_at, content) VALUES (?, ?, NOW(), ?)',
    {
      replacements: [senderId, receiverId, content],
      type: sequelize.QueryTypes.INSERT
    }
  );

  res.json({ message: 'Message sent successfully' });
}

const getMessagesRoom = async (req, res) => {
  const receiverId = req.user.id;
  console.log(receiverId);
  const senderId = req.params.id;

  const messages = await sequelize.query(
    'SELECT * FROM group_chat WHERE room_id = ? ORDER BY created_at ASC',
    {
      replacements: [senderId, receiverId, receiverId, senderId],
      type: sequelize.QueryTypes.SELECT
    }
  );

  res.json(messages);
}

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
    const users = await sequelize.query(
      `SELECT * FROM register
      WHERE id != :userId
      AND (id IN (SELECT 	user_id FROM user_follower WHERE follower_id  = :userId AND status = '0')
           OR id IN (SELECT 	follower_id  FROM user_follower WHERE user_id = :userId AND status = '0'))`,
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



// chat api 


const createRoom = async (req, res) => {
  try {
    const {userId, selectedUsers } = req.body;


    const userSelected_id = JSON.stringify(selectedUsers);

    console.log(userSelected_id);
    console.log(req.body);
    console.log(selectedUsers);

    const users = await sequelize.query(
      'INSERT INTO rooms (user_id, created_user_id) VALUES (?, ?)',
      {
        replacements: [userSelected_id, userId],
        type: sequelize.QueryTypes.INSERT
      }
    );
    res.json("Room Created Successfully");
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



const findRoomByUserId = async (req, res) => {
  try {
    const {userId } = req.body;

    console.log(userId, "login user find room user id ");

    const rooms = await sequelize.query(
      'SELECT user_id FROM rooms ',
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );
    


    // find room where my id is avilable in user_id or created_user_id if any place my userid is avilable then show perticuler room

    console.log(rooms[0].user_id);

    const finduserIdFromRoom = rooms[0].user_id.includes(userId); 
    console.log(finduserIdFromRoom);

    const roomsCreatedId = await sequelize.query(
      'SELECT created_user_id FROM rooms WHERE created_user_id = ?',
      {
        replacements: [userId],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // const finduserIdFromCreatedRoom = roomsCreatedId[0].created_user_id == userId; 

    // console.log(roomsCreatedId, finduserIdFromCreatedRoom);


    console.log(roomsCreatedId);


    if(finduserIdFromRoom || roomsCreatedId){
      const roomsGet = await sequelize.query(
        'SELECT * FROM rooms ',
        {
          type: sequelize.QueryTypes.SELECT,
        }
      );
      res.json(roomsGet);
    }
  } catch (error) {
    console.error('Error finding room by user ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



module.exports = {
  registerUser,
  getMessagesSenderRoom,
  sendMessageRoom,
  getMessagesRoom,
  updateUserProfile,
  loginUser,
  getAllUsersIfFollow,
  updateUserType,
  createUserProfile,
  createBusinessProfile,
  createRoom,
  findRoomByUserId,
  getUserProfile,
  getImage,
  googleLogin,
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
  getAllUserRequirementsUserFollo
};