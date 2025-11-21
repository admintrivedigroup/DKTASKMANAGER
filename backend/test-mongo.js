// Test MongoDB Connection
require("dotenv").config();
const mongoose = require("mongoose");

console.log("🔍 Diagnosing MongoDB Connection...");
console.log("📋 Connection Details:");
console.log("   URI:", process.env.MONGO_URI ? "✅ Found" : "❌ Missing");

if (process.env.MONGO_URI) {
  // Parse the URI to show details (without exposing password)
  const uri = process.env.MONGO_URI;
  const parts = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]*)/);
  
  if (parts) {
    console.log("   Username:", parts[1]);
    console.log("   Password:", "***" + parts[2].slice(-3));
    console.log("   Host:", parts[3]);
    console.log("   Database:", parts[4] || "❌ NO DATABASE NAME");
  }
}

async function testConnection() {
  try {
    console.log("\n🔌 Attempting to connect...");
    
    const options = {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    };
    
    await mongoose.connect(process.env.MONGO_URI, options);
    console.log("✅ SUCCESS! MongoDB connected successfully");
    console.log("📊 Database name:", mongoose.connection.name);
    console.log("🏠 Host:", mongoose.connection.host);
    console.log("🔗 Ready state:", mongoose.connection.readyState);
    
  } catch (error) {
    console.log("❌ FAILED! Connection error:");
    console.log("   Error code:", error.code);
    console.log("   Error message:", error.message);
    
    if (error.code === 8000) {
      console.log("\n🔑 AUTHENTICATION PROBLEM:");
      console.log("   • Username or password is incorrect");
      console.log("   • User doesn't have database permissions");
      console.log("   • Check MongoDB Atlas Database Access settings");
    }
    
    if (error.message.includes("IP")) {
      console.log("\n🌐 NETWORK PROBLEM:");
      console.log("   • IP address not whitelisted");
      console.log("   • Check MongoDB Atlas Network Access settings");
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("🔌 Connection closed");
    }
    process.exit(0);
  }
}

testConnection();
