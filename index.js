const { PORT = 3000 } = process.env;
const { client } = require("./db");
client.connect();

const express = require("express");
const server = express();
const apiRouter = require("./api");

const morgan = require("morgan");
server.use(morgan("dev"));

server.use(express.json());

server.use((req, res, next) => {
  console.log("<____Body Logger START____>");
  console.log(req.body);
  console.log("<_____Body Logger END_____>");

  next();
});

server.use("/api", apiRouter);

server.listen(PORT, () => {
  console.log("The server is up on port", PORT);
});
