const userModel = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { uploadFile } = require("../aws/aws");
const {
  isValid,
  isValidFiles,
  isValidRequestBody,
  isValidObjectId,
  validFileRegex,
  stringRegex,
  passwordRegex,
  phoneRegex,
  pincodeRegex,
  emailRegex,
} = require("../middleware/validator");

const createUser = async function (req, res) {
  try {
    let body = req.body;
    let { fname, lname, phone, email, password, address } = body;

    if (!isValidRequestBody(body)) {
      return res
        .status(400)
        .send({ status: false, message: "Plz Enter Some input" });
    }
    if (!isValid(fname)) {
      return res
        .status(400)
        .send({ status: false, message: "Plz Enter the valid FName" });
    }
    if (!isValid(lname)) {
      return res
        .status(400)
        .send({ status: false, message: "Plz Enter the valid LName" });
    }
    if (!isValid(email)) {
      return res
        .status(400)
        .send({ status: false, message: "Plz Enter the email" });
    }
    if (!isValid(phone)) {
      return res
        .status(400)
        .send({ status: false, message: "Plz Enter the phone" });
    }
    if (!isValid(address)) {
      return res
        .status(400)
        .send({ status: false, message: "Plz Enter the address" });
    }

    if (!isValid(password)) {
      return res
        .status(400)
        .send({ status: false, message: "Plz Enter the password" });
    }

    if (address) {
      const passAddress = JSON.parse(body.address);
      address = passAddress;
      body.address = address;
    }
    if (!isValid(address.shipping)) {
      return res
        .status(400)
        .send({ status: false, message: "shipping address is reqiured" });
    }
    if (!address.shipping.street) {
      return res
        .status(400)
        .send({ status: false, message: "Enter the street" });
    }
    if (!address.shipping.city) {
      return res.status(400).send({ status: false, message: "Enter the city" });
    }
    if (!address.shipping.pincode) {
      return res
        .status(400)
        .send({ status: false, message: "Enter the pincode" });
    }
    if (!pincodeRegex.test(address.shipping.pincode)) {
      return res
        .status(400)
        .send({ status: false, message: "Enter the valid pincode" });
    }
    if (!address.billing.street) {
      return res
        .status(400)
        .send({ status: false, message: "Enter the valid street" });
    }
    if (!address.billing.city) {
      return res
        .status(400)
        .send({ status: false, message: "Enter the valid city" });
    }
    if (!address.billing.pincode) {
      return res
        .status(400)
        .send({ status: false, message: "Enter the valid pincode" });
    }
    if (!pincodeRegex.test(address.billing.pincode)) {
      return res
        .status(400)
        .send({ status: false, message: "Enter the valid pincode" });
    }

    if (!stringRegex.test(fname)) {
      return res
        .status(400)
        .send({ status: false, message: "plz enter  the valid fname" });
    }
    if (!stringRegex.test(lname)) {
      return res
        .status(400)
        .send({ status: false, message: "plz enter  the valid lname" });
    }
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .send({ status: false, message: "plz enter  the valid Email" });
    }

    let checkEmail = await userModel.findOne({ email: email });
    if (checkEmail) {
      return res.status(400).send({
        status: false,
        message: `${email} already exists use the diff email `,
      });
    }

    let checkphone = await userModel.findOne({ phone: body.phone });
    if (checkphone) {
      return res.status(400).send({
        status: false,
        message: `${body.phone} already exists use the diff phone `,
      });
    }

    if (!passwordRegex.test(password)) {
      return res
        .status(400)
        .send({ status: false, message: "plz enter  the valid password" });
    }

    let securePassword = body.password;
    const encrytedpassword = async function (securePassword) {
      const passwordHash = await bcrypt.hash(securePassword, 10);
      body.password = passwordHash;
    };
    encrytedpassword(securePassword);

    let files = req.files;
    if (files && files.length > 0) {
      let uploadProfileImage = await uploadFile(files[0]);
      body.profileImage = uploadProfileImage;
    } else {
      return res
        .status(400)
        .send({ status: false, message: "please upload the profile Imge " });
    }

    let userCreated = await userModel.create(body);

    res.status(201).send({
      status: true,
      message: "User cerated Successfully",
      data: userCreated,
    });

  } catch (err) {
    console.log(err.message)
    res.status(500).send({ status: false, Error: "server not  responding", message: err.message });
  }
};
//******loginUser********** */
const loginUser = async function (req, res) {
  try {
    let body = req.body;
    const { email, password } = body;

    if (!isValidRequestBody(body)) { 
      return res
        .status(400)
        .send({ status: false, message: "Insert Data : BAD REQUEST" });
    }

    if (!isValid(email)) {
      return res
        .status(400)
        .send({ status: false, message: "Please provide email" });
    }
    if (!isValid(password)) {
      return res
        .status(400)
        .send({ status: false, message: "Please provide password" });
    }
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .send({ status: false, message: `${email} valid Email Id` });
    }
    if (!passwordRegex.test(password)) {
      return res.status(400).send({
        status: false,
        message:
          "password  length be valid and length should be in between 8 to 15",
      });
    }
    const user = await userModel.findOne({ email: email });
    if (!user) {
      return res
        .status(401)
        .send({ status: false, message: "Invalid credentials" });
    }

    let userPassword = await bcrypt.compareSync(body.password, user.password);
    console.log(userPassword);

    if (!userPassword) {
      return res
        .status(401)
        .send({ status: false, message: "Invalid Password" });
    }

    let token = jwt.sign(
      {
        userId: user._id, //unique Id
        at: Math.floor(Date.now() / 1000), //issued date
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, //expires in 24 hr
      },
      "Group-15"
    );
    console.log(Date.now())

    res.setHeader("Authorization", token);
    res.status(200).send({
      status: true,
      message: "login Successful",
      data: { userId: user._id, token: token },
    });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

//********GET User ***************/
const getUser = async function (req, res) {
  try {
    const params = req.params;
    const userId = params.userId;
    if (!userId) {
      return res
        .status(400)
        .send({ status: false, message: "plz enter  user id params" });
    }
    if (!isValidObjectId(userId)) {
      return res
        .status(400)
        .send({ status: false, message: "UserId is incorrect" });
    }

    const user = await userModel.findOne({ _id: userId });

    if (!user) {
      return res.status(404).send({
        status: false,
        message: `user id did't not  find this ${userId} id`,
      });
    }
    return res
      .status(200)
      .send({ status: true, message: "user profile details", data: user });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

//************PUT or Updated *******************/

const updateUser = async function (req, res) {
  try {
    let data = req.body;
    if (!isValidRequestBody(data)) {
      return res.status(400).send({ status: false, message: "plz input data" });
    }
    let { fname, lname, email, phone, profileImage } = data;
    //updated profileImage
    if (profileImage) {
      const files = req.files;
      let profileImage;
      if (isValidFiles(files)) {
        const profilePicture = await uploadFile(files[0]);
        profileImage = profilePicture;
      }
    }
    if (fname) {
      if (!stringRegex.test(fname)) {
        return res
          .status(400)
          .send({ status: false, message: "plz enter  the valid fname" });
      }
    }
    if (lname) {
      if (!stringRegex.test(lname)) {
        return res
          .status(400)
          .send({ status: false, message: "plz enter  the valid lname" });
      }
    }
    if (email) {
      if (!emailRegex.test(email)) {
        return res
          .status(400)
          .send({ status: false, message: "plz enter  the valid Email" });
      }
    }
    let checkEmail = await userModel.findOne({ email: email });
    if (checkEmail) {
      return res.status(400).send({
        status: false,
        message: `${email} already exists use the diff email `,
      });
    }
    if (phone) {
      if (!phoneRegex.test(phone)) {
        return res.status(400).send({
          status: false,
          message: `${phone} invalid phone  Number`,
        });
      }
      const isphoneAleradyExist = await userModel.findOne({ phone: phone });
      if (isphoneAleradyExist) {
        return res.status(400).send({
          status: false,
          message: `${phone} already exists use the diff phone `,
        });
      }
    }

    let password;
    if (data.password) {
      if (!passwordRegex.test(data.password)) {
        return res.status(400).send({
          status: false,
          message: `${password} password length should be mix 8 or max 15 `,
        });
      }
      password = await bcrypt.hash(data.password, 10);
    }

    //let address = json.parse(JSON.stringify(data))

    if (data.address) {
      const address = JSON.parse(data.address);
      data.address = address;
      const shipping = address.shipping;
      if (shipping) {
        if (shipping.pincode) {
          if (!pincodeRegex.test(shipping.pincode))
            return res.status(400).send({
              status: false,
              message: `enter valid pincode`,
            });
        }
      }
    }

    const billing = address.billing;
    if (billing) {
      if (billing.pincode) {
        if (!pincodeRegex.test(billing.pincode)) {
          return res.status(400).send({
            status: false,
            message: `enter the valid pincode `,
          });
        }
      }
    }
    const newData = { fname, lname, email, phone, password, profileImage };
    const updatedUser = await userModel.findOneAndUpdate(
      { _id: req.userId },
      newData,
      { new: true }
    );

    if (data.address) {
      const shipping = data.address.shipping;
      if (shipping) {
        if (shipping.street) {
          updateUser.address.shipping.street = shipping.street;
        }
        if (shipping.city) {
          updateUser.address.shipping.city = shipping.city;
        }
        if (shipping.pincode) {
          updateUser.address.shipping.pincode = shipping.pincode;
        }
      }
      const billing = data.address.billing;
      if (billing) {
        if (billing.street) {
          updateUser.address.billing.street = billing.street;
        }
        if (billing.city) {
          updateUser.address.billing.city = billing.city;
        }
        if (billing.pincode) {
          updateUser.address.billing.pincode = billing.pincode
        }
      }
    }

    updatedUser.save();
    return res
      .status(200)
      .send({ status: true, message: "User updateded", data: updatedUser });


  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};
module.exports = { createUser, loginUser, getUser, updateUser };
