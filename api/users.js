const express = require("express");
const usersRouter = express.Router();
const jwt = require("jsonwebtoken");
const { requireUser } = require("./utils");
const { getAllUsers, getUserByUsername, createUser, getUserById, updateUser } = require("../db");
usersRouter.use((req, res, next) => {
  console.log("A request is being made to /users");

  next();
});

usersRouter.post("/login", async (req, res, next) => {
  const { username, password } = req.body;

  // request must have both
  if (!username || !password) {
    next({
      name: "MissingCredentialsError",
      message: "Please supply both a username and password",
    });
  }

  try {
    const user = await getUserByUsername(username);

    if (user && user.password == password) {
      // create token & return to user
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1w" }
      );
      console.log(token);

      res.send({ message: "you're logged in!", token: token });
    } else {
      next({
        name: "IncorrectCredentialsError",
        message: "Username or password is incorrect",
      });
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

usersRouter.post("/register", async (req, res, next) => {
  const { username, password, name, location } = req.body;

  try {
    const _user = await getUserByUsername(username);

    if (_user) {
      next({
        name: "UserExistsError",
        message: "A user by that username already exists",
      });
    }

    const user = await createUser({
      username,
      password,
      name,
      location,
    });

    const token = jwt.sign(
      {
        id: user.id,
        username,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1w",
      }
    );

    res.send({
      message: "thank you for signing up",
      token,
    });
  } catch ({ name, message }) {
    next({ name, message });
  }
});

usersRouter.get("/", async (req, res) => {
  const allUsers = await getAllUsers();

  const users = allUsers.filter(user => {
    return user.active;
  });


  res.send({
    users,
  });
});

usersRouter.patch('/:userId', requireUser, async (req, res, next) => {
  const { userId } = req.params;
  const { username, password, name, location, active } = req.body;

  const updateFields = {};

  if (username) {
    updateFields.username = username;
  }
  if (password) {
    updateFields.password = password;
  }
  if (name) {
    updateFields.name = name;
  }
  if (location) {
    updateFields.location = location;
  }
  if (active) {
    updateFields.active = active;
  }
  try {
    const originalUser = await getUserById(userId);

    if (originalUser && originalUser.id === req.user.id) {
      const updatedUser = await updateUser(userId, updateFields);
      res.send({ user: updatedUser })
    } else {
      next({
        name: 'UnauthorizedUserError',
        message: 'You cannot update a user that is not you'
      })
    }
  } catch ({ name, message }) {
    next({ name, message });
  }
});

module.exports = usersRouter;
