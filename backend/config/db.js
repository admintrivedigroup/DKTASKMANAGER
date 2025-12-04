const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      dbName: "dk_task_manager",   // ★ FORCE CORRECT DB ★
    });

    console.log("✅ MongoDB connected successfully");
    console.log("📊 Active Database:", mongoose.connection.db.databaseName);
    console.log("🔗 Connection Host:", mongoose.connection.host);

    // 🧩 DEBUG: Check all active connections
    console.log("🧩 Connections Count:", mongoose.connections.length);
    console.log(
      "🧩 Connections Details:",
      mongoose.connections.map(conn => ({
        name: conn.name,
        readyState: conn.readyState,
        host: conn.host,
        port: conn.port,
      }))
    );

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
