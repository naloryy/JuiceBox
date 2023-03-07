const LOCAL_URL = "postgres://localhost:5432/juicebox-dev"

const { Client } = require("pg");
const client = new Client(DATABASE_URL);

//change
//returns all users from database
async function getAllUsers() {
  const { rows } = await client.query(
    `SELECT id, username, name, location, active
      FROM users;
    `
  );

  return rows;
}
//create user and returns the user except password
async function createUser({ username, password, name, location }) {
  try {
    const {
      rows: [user],
    } = await client.query(
      `INSERT INTO users(username, password, name, location)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT(username)DO NOTHING
      RETURNING *;
    `,
      [username, password, name, location]
    );
    delete user.password;
    return user;
  } catch (error) {
    throw error;
  }
}
//changes fields in users database and returns the new user except the password
async function updateUser(id, fields = {}) {
  const setString = Object.keys(fields)
    .map((key, index) => `"${key}"=$${index + 1}`)
    .join(", ");

  if (setString.length === 0) {
    return;
  }

  try {
    const {
      rows: [user],
    } = await client.query(
      `
        UPDATE users
        SET ${setString}
        WHERE id=${id}
        RETURNING *;
      `,
      Object.values(fields)
    );
    delete user.password;
    return user;
  } catch (error) {
    throw error;
  }
}
//return the user from their id except password
async function getUserById(userId) {
  try {
    const {
      rows: [user],
    } = await client.query(`
        SELECT * FROM users
        WHERE "id"=${userId};
      `);
    if (!user) {
      return null;
    }
    delete user.password;

    myPosts = await getPostsByUser(userId);
    user.posts = myPosts;

    return user;
  } catch (error) {
    throw error;
  }
}

//create post and return the new post
async function createPost({ authorId, title, content, tags = [] }) {
  try {
    const {
      rows: [post],
    } = await client.query(
      `
      INSERT INTO posts("authorId", title, content) 
      VALUES($1, $2, $3)
      RETURNING *;
    `,
      [authorId, title, content]
    );

    const tagList = await createTags(tags);

    return await addTagsToPost(post.id, tagList);
  } catch (error) {
    throw error;
  }
}
//updates post and returns the new post
async function updatePost(id, fields = {}) {
  const { tags } = fields;
  delete fields.tags;
  const setString = Object.keys(fields)
    .map((key, index) => `"${key}"=$${index + 1}`)
    .join(", ");

  try {
    if (setString.length > 0) {
      await client.query(
        `
        UPDATE posts
        SET ${setString}
        WHERE id=${id}
        RETURNING *;
      `,
        Object.values(fields)
      );
      if (tags === undefined) {
        return await getPostById(id);
      }
    }
    const tagList = await createTags(tags);
    const tagListIdString = tagList.map((tag) => `${tag.id}`).join(", ");

    // delete any post_tags from the database which aren't in that tagList
    await client.query(
      `
  DELETE FROM post_tags
  WHERE "tagId"
  NOT IN (${tagListIdString})
  AND "postId"=$1;
`,
      [id]
    );

    // and create post_tags as necessary
    await addTagsToPost(id, tagList);

    return await getPostById(id);
  } catch (error) {
    throw error;
  }
}
//return all posts from database
async function getAllPosts() {
  try {
    const { rows: postIds } = await client.query(`
      SELECT id
      FROM posts;
    `);

    const posts = await Promise.all(
      postIds.map((post) => getPostById(post.id))
    );

    return posts;
  } catch (error) {
    throw error;
  }
}
//return all post associated with a user id
async function getPostsByUser(userId) {
  try {
    const { rows: postIds } = await client.query(`
      SELECT id 
      FROM posts 
      WHERE "authorId"=${userId};
    `);

    const posts = await Promise.all(
      postIds.map((post) => getPostById(post.id))
    );

    return posts;
  } catch (error) {
    throw error;
  }
}
//returns a post and its tags
async function getPostById(postId) {
  try {
    const {
      rows: [post],
    } = await client.query(
      `
      SELECT *
      FROM posts
      WHERE id=$1;
    `,
      [postId]
    );

    // THIS IS NEW
    if (!post) {
      throw {
        name: "PostNotFoundError",
        message: "Could not find a post with that postId",
      };
    }
    // NEWNESS ENDS HERE

    const { rows: tags } = await client.query(
      `
      SELECT tags.*
      FROM tags
      JOIN post_tags ON tags.id=post_tags."tagId"
      WHERE post_tags."postId"=$1;
    `,
      [postId]
    );

    const {
      rows: [author],
    } = await client.query(
      `
      SELECT id, username, name, location, active
      FROM users
      WHERE id=$1;
    `,
      [post.authorId]
    );

    post.tags = tags;
    post.author = author;

    delete post.authorId;

    return post;
  } catch (error) {
    throw error;
  }
}
//returns all posts associated with a tag
async function getPostsByTagName(tagName) {
  try {
    const { rows: postIds } = await client.query(
      `
      SELECT posts.id FROM posts
      JOIN post_tags ON posts.id=post_tags."postId"
      JOIN tags ON tags.id=post_tags."tagId"
      WHERE tags.name=$1;
    `,
      [tagName]
    );

    return await Promise.all(postIds.map((post) => getPostById(post.id)));
  } catch (error) {
    throw error;
  }
}

//creates tags and returns an array of the new tags
async function createTags(tagList) {
  if (tagList.length === 0) {
    return;
  }
  try {
    const insertValues = tagList
      .map((_, index) => `$${index + 1}`)
      .join("), (");
    const selectValues = tagList.map((_, index) => `$${index + 1}`).join(", ");

    await client.query(
      `INSERT INTO tags(name)
       VALUES (${insertValues})
       ON CONFLICT (name) DO NOTHING;
     `,
      tagList
    );

    const { rows } = await client.query(
      `SELECT * FROM tags
      WHERE name
      IN (${selectValues})
      `,
      tagList
    );
    return rows;
  } catch (error) {
    throw error;
  }
}
//creates a post tag to join posts and their tags
async function createPostTag(postId, tagId) {
  try {
    await client.query(
      `
      INSERT INTO post_tags("postId", "tagId")
      VALUES ($1, $2);
    `,
      [postId, tagId]
    );
  } catch (error) {
    throw error;
  }
}
//calls create posttag for every tag with the post id and returns the post with its tags
async function addTagsToPost(postId, tagList) {
  try {
    const createPostTagPromises = tagList.map((tag) =>
      createPostTag(postId, tag.id)
    );

    await Promise.all(createPostTagPromises);
    return await getPostById(postId);
  } catch (error) {
    throw error;
  }
}

async function getAllTags() {
  try {
    const { rows } = await client.query(`
      SELECT *
      FROM tags;
    `);
    return rows;
  } catch (error) {
    throw error;
  }
}

async function getUserByUsername(username) {
  try {
    const {
      rows: [user],
    } = await client.query(
      `
      SELECT *
      FROM users
      WHERE username=$1;
    `,
      [username]
    );

    return user;
  } catch (error) {
    throw error;
  }
}
module.exports = {
  client,
  createUser,
  getAllUsers,
  updateUser,
  createPost,
  updatePost,
  getAllPosts,
  getPostsByUser,
  getUserById,
  addTagsToPost,
  createTags,
  getPostsByTagName,
  getAllTags,
  getUserByUsername,
  getPostById,
};
