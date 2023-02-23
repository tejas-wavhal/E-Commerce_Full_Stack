const mongoose = require("mongoose");

const connectDatabase = () => {
  mongoose
    .set('strictQuery', true) //new update warning will be gone
    .connect(process.env.DB_URI, {
      useNewUrlParser: true,
      // useUnifiedTopology: true,
      // useCreateIndex: true,
    })
    .then((data) => {  //when connected then
      console.log(`Mongodb connected with server: ${data.connection.host}`);
    });
};

module.exports = connectDatabase;
