const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Add connection options for better stability
    const options = {
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    };
    
    await mongoose.connect(process.env.MONGO_URI, options);
    console.log("✅ MongoDB connected successfully");
    console.log("📊 Database:", mongoose.connection.name);
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:");
    console.error("Error message:", err.message);
    if (err.code === 8000) {
      console.error("🔑 Authentication failed. Please check your MongoDB credentials.");
      console.error("💡 Make sure:");
      console.error("   1. Username and password are correct");
      console.error("   2. User has proper database permissions");
      console.error("   3. IP address is whitelisted in MongoDB Atlas");
    }
    process.exit(1);
  }
};

module.exports = connectDB;
