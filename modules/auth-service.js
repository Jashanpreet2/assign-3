require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
let Schema = mongoose.Schema;

let userSchema = new Schema({
  userName: {
    type: String,
    unique: true,
  },
  password: String,
  email: String,
  loginHistory: [{ dateTime: Date, userAgent: String }],
});
let User;

function initialize() {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(process.env.MONGODB);

    db.on("error", (err) => {
      reject(err);
    });
    db.once("open", () => {
      User = db.model("users", userSchema);
      resolve();
    });
  });
}

function registerUser(userData) {
  return new Promise((resolve, reject) => {
    if (userData.password !== userData.password2) {
      reject("Passwords do not match");
    } else {
      bcrypt
        .hash(userData.password, 10)
        .then((hash) => {
          userData.password = hash;
          console.log(hash);
          console.log("User Data: ", userData);
          let newUser = new User(userData);
          console.log("New user: ", newUser);
          newUser
            .save()
            .then(() => {
              resolve();
            })
            .catch((err) => {
              if (err.code === 11000) {
                reject("User Name already taken");
              } else {
                reject("There was an error creating the user: " + err);
              }
            });
        })
        .catch((err) => {
          console.log(err);
        });
    }
  });
}

function checkUser(userData) {
  return new Promise((resolve, reject) => {
    User.find({ userName: userData.userName }).then((users) => {
      if (users.length === 0) {
        reject("Unable to find user: " + userData.userName);
      } else if (!bcrypt.compare(userData.password, users[0].password).then((result) => {
        return result;
      })) {
        reject("Incorrect password for user: " + userData.userName);
      } else {
        if (users[0].loginHistory.length == 8) {
          users[0].loginHistory.pop();
        }
        users[0].loginHistory.unshift({
          dateTime: new Date().toString(),
          userAgent: userData.userAgent,
        });
        User.updateOne(
          { userName: users[0].userName },
          { $set: { loginHistory: users[0].loginHistory } }
        )
          .exec()
          .then(() => {
            resolve(users[0]);
          })
          .catch((err) => {
            reject("There was an error verifying the user: " + err);
          });
      }
    });
  });
}
module.exports = { initialize, registerUser, checkUser };
