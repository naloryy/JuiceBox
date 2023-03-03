const express = require("express");
const postsRouter = express.Router();
const { requireUser } = require('./utils');
const { getAllPosts, createPost } = require('../db');

postsRouter.use((req, res, next) => {
  console.log("A request is being made to /posts");

  next();
});

postsRouter.get('/', async (req,res) =>{
    const posts = await getAllPosts();
    
    
    res.send({
        posts
    })
})

postsRouter.post('/', requireUser, async (req, res, next) => {
  const { title, content, tags = "" } = req.body;

  const tagArr = tags.trim().split(/\s+/)
  const postData = {};

  // only send the tags if there are some to send
  if (tagArr.length) {
    postData.tags = tagArr;
  }

  try {
    postData.authorId = req.user.id
    postData.title = title;
    postData.content = content;
    const post = await createPost(postData);
    if(!post){
      next({
        name: "PostError",
        message: "post failed",
      });
    }
    res.send({ post })
    // otherwise, next an appropriate error object 
  } catch ({ name, message }) {
    next({ name, message });
  }
});



module.exports = postsRouter;