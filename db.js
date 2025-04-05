const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://tanmaybodkhe491:tanmaybodkhe491@cluster0.2wv01.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Failed:', error);
    process.exit(1);
  }
};

connectDB();

module.exports = connectDB;
