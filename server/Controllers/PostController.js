import PostModel from "../Models/postModel.js";
import mongoose from "mongoose";
import UserModel from "../Models/userModel.js";

// Creat new Post
export const createPost = async (req, res) => {
  // inside the body of the request, we are sending all the details for the new post
  //   then, embed it into the post model object
  // store that object in a newPost variable
  const newPost = new PostModel(req.body);

  try {
    await newPost.save();
    res.status(200).json(newPost);
  } catch (error) {
    res.status(500).json(error);
  }
};

// Get a post

export const getPost = async (req, res) => {
  const id = req.params.id; // from http request

  try {
    const post = await PostModel.findById(id); // it will return the post from PostModel by id in a constant variable post and shows us
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json(error);
  }
};

// Update a post
export const updatePost = async (req, res) => {
  const postId = req.params.id; // in url, we will send the id of post we want to update
  const { userId } = req.body; // in body, we will send the user id and the data we want to update

  try {
    const post = await PostModel.findById(postId); // the post we want to update will come from postmodel by id

    // after getting the post, check its validity and authenticity

    // validity check : no user can update the posts of another users
    if (post.userId === userId) {
      await post.updateOne({ $set: req.body }); // update the post
      res.status(200).json("Post Updated");
    } else {
      res.status(403).json("Action forbidden");
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  const id = req.params.id; // post id
  const { userId } = req.body; // user id

  try {
    const post = await PostModel.findById(id);

    // post id and user id should be same
    if (post.userId === userId) {
      await post.deleteOne();
      res.status(200).json("Post deleted successfully");
    } else {
      res.status(403).json("Action forbidden");
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// like/dislike a post
export const likePost = async (req, res) => {
  const id = req.params.id; // post id
  const { userId } = req.body; // user id

  try {
    const post = await PostModel.findById(id); // the post we want to like or dislike will come from postmodel by id of that post

    // as , we have a likes array in our postmodel which will stores the userids..
    // if we have not already liked the post of a user, then like his/her post
    if (!post.likes.includes(userId)) {
      await post.updateOne({ $push: { likes: userId } }); // uske likes mein hmari userid jayegy i.e. we have liked his/her post
      res.status(200).json("Post liked");
    } else {
      // if already liked, then dislike it now..
      await post.updateOne({ $pull: { likes: userId } });
      res.status(200).json("Post Unliked");
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// Most Imp. Functionality-------
// Get Timeline Posts
export const getTimelinePosts = async (req, res) => {
  const userId = req.params.id; // get an id of the user who wants to get his/her timeline post

  //   now, as we know that the timeline of any user includes posts of his/herself and the posts of the other users to whom he/she have followed

  try {
    const currentUserPosts = await PostModel.find({ userId: userId }); // receive the posts of the current user(eg. -> us) from postmodel who wants to get/see his timeline posts

    // our followers and whom we have followed, their posts too
    const followingPosts = await UserModel.aggregate([
      // aggregate is the most complex method to interact with the database
      //   and we have used the aggregation pipeline

      //   Basically, aggregation is an array of steps
      {
        // this first query/step ----> will return a single document which will contain our user id in its id field..
        $match: {
          _id: new mongoose.Types.ObjectId(userId), // checks if -> this user is present or not in the usermodel
        },
      },
      {
        // second step ----> we use lookup when we have to match the document in an other model by placing the query in an another model..
        // means, we are placing the query on the usermodel and wanna get results from the post model..
        $lookup: {
          // so, integrate with the post model while remaining inside the user model
          from: "posts", // name of our postmodel in atlas is -> posts
          localField: "following", // get the posts whose user ids are included in the followings array of our current user..eg. krishnapriya is in my followings
          foreignField: "userId",
          as: "followingPosts", // get result as a followingPosts object
        },
      },
      {
        // third type ----> project means return type of the aggregation ...means which fields we want to return as a result
        $project: {
          followingPosts: 1, // just return one field we made in lookup
          _id: 0, // as, by-default aggregation always returns one extra field which is id..but we don't want that.. so make id:0
        },
      },
    ]);
    // see result in response(res)
    res.status(200).json(
      currentUserPosts
        .concat(...followingPosts[0].followingPosts) // it will first show our posts and then show posts of the other users whom we have followed --> "but in a same manner (...followingPosts[0].followingPosts)"
        .sort((a, b) => {
          return b.createdAt - a.createdAt; // now latest posts will appear first as we have sorted the posts acc. to the time (descending order)
        })
    );
  } catch (error) {
    res.status(500).json(error);
  }
};
