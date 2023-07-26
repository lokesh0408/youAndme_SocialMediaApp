import UserModel from "../Models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// get a User
export const getUser = async (req, res) => {
  const id = req.params.id; // from url request

  try {
    const user = await UserModel.findById(id);

    if (user) {
      // send a user to the application but without his password
      const { password, ...otherDetails } = user._doc;

      res.status(200).json(otherDetails);
    } else {
      res.status(404).json("No such user exists");
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// Get all users
export const getAllUser = async (req, res) => {
  try {
    let users = await UserModel.find(); // for first 20 users only
    users = users.map((user) => {
      const { password, ...otherDetails } = user._doc;
      return otherDetails;
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json(error);
  }
};

// update a user
export const updateUser = async (req, res) => {
  const id = req.params.id; // id of the user that should be updated in the response
  const { _id, currentUserAdminStatus, password } = req.body; // currentUserId = id of the user who is performing an action of updating

  //   if user is same || user is admin
  if (id === _id) {
    // if id belongs to same user like eg. user wants to update his profile
    // currentUserAdminStatus = if admin of the social media app wants to update the user
    try {
      // if a user wants to update his password
      if (password) {
        const salt = await bcrypt.genSalt(10);
        // before updating the new info in the database, it will convert the body of the request and in the body of the request it will change the password field with the hashed password
        req.body.password = await bcrypt.hash(password, salt);
      }

      const user = await UserModel.findByIdAndUpdate(id, req.body, {
        // id of the user that should be updated in the response
        // req.body is that info whom a user wants to update
        new: true, // now, get a updated user
      });

      const token = jwt.sign(
        { username: user.username, id: user._id },
        process.env.JWTKEY,
        { expiresIn: "1h" }
      );

      res.status(200).json({ user, token });
    } catch (error) {
      res.status(500).json(error);
    }
  } else {
    res.status(403).json("Access Denied! you can only update your own profile");
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  const id = req.params.id;

  const { currentUserId, currentUserAdminStatus } = req.body;

  if (currentUserId === id || currentUserAdminStatus) {
    try {
      await UserModel.findByIdAndDelete(id);
      res.status(200).json("User deleted successfully");
    } catch (error) {
      res.status(500).json(error);
    }
  } else {
    res.status(403).json("Access Denied! you can only delete your own profile");
  }
};

// Follow a User
export const followUser = async (req, res) => {
  const id = req.params.id; // a user who should be followed

  const { _id } = req.body; // a user who wants to follow the another user

  // user can't follow him/herself
  if (_id === id) {
    res.status(403).json("Action forbidden");
  } else {
    try {
      const followUser = await UserModel.findById(id); // user whom we want to follow
      const followingUser = await UserModel.findById(_id); // us

      // if we have not already followed the another user
      if (!followUser.followers.includes(_id)) {
        // then, follow him/her
        await followUser.updateOne({ $push: { followers: _id } });
        // also, updates our following by pushing his id into our following..
        await followingUser.updateOne({ $push: { following: id } });
        res.status(200).json("User followed!");
      } else {
        res.status(403).json("User is Already followed by you");
      }
    } catch (error) {
      res.status(500).json(error);
    }
  }
};

// UnFollow a User
export const UnFollowUser = async (req, res) => {
  const id = req.params.id;

  const { _id } = req.body;

  if (_id === id) {
    res.status(403).json("Action forbidden");
  } else {
    try {
      const followUser = await UserModel.findById(id);
      const followingUser = await UserModel.findById(_id);

      // if we have already followed the another user
      if (followUser.followers.includes(_id)) {
        await followUser.updateOne({ $pull: { followers: _id } });
        await followingUser.updateOne({ $pull: { following: id } });
        res.status(200).json("User Unfollowed!");
      } else {
        res.status(403).json("User is not followed by you");
      }
    } catch (error) {
      res.status(500).json(error);
    }
  }
};
