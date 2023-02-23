const app = require("./app");
const cloudinary = require("cloudinary");
const connectDatabase = require("./config/database");
const dotenv = require('dotenv')

// Handling Uncaught Exception      //we are using this up because if we use down then if Uncaught Exception is there above this then it will not work. Using this up will will work because it will detect after use
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(`Shutting down the server due to Uncaught Exception`);
  process.exit(1);
});

// Config
dotenv.config({ path: "backend/config/config.env" })  //so that we can use dot env
// if (process.env.NODE_ENV !== "PRODUCTION") {
//   require("dotenv").config({ path: "backend/config/config.env" });  //so that we can use dot env
// }

// Connecting to database
connectDatabase();  //we are connecting after config path is given so that it will get dot env which DB_URI is getting in datebase.js  

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const server = app.listen(process.env.PORT, () => {
  console.log(`Server is working on http://localhost:${process.env.PORT}`);
});

// Unhandled Promise Rejection
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(`Shutting down the server due to Unhandled Promise Rejection`);

  server.close(() => {
    process.exit(1);
  });
});
