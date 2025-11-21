require("dotenv").config();
const { sendTaskAssignmentEmail, sendTaskReminderEmail } = require("./utils/emailService");

// Test email configuration
const testEmailConfig = async () => {
  console.log("Testing email configuration...");
  
  const requiredVars = ["EMAIL_HOST", "EMAIL_PORT", "EMAIL_USER", "EMAIL_PASS"];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:", missingVars);
    console.log("\nPlease add these to your .env file:");
    missingVars.forEach(varName => {
      console.log(`${varName}=your_value_here`);
    });
    return false;
  }
  
  console.log("✅ All required email environment variables are set");
  return true;
};

// Test sending a sample assignment email
const testAssignmentEmail = async () => {
  if (!await testEmailConfig()) return;
  
  const sampleTask = {
    title: "Test Task Assignment",
    description: "This is a test task to verify email functionality",
    priority: "Medium",
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
  };
  
  const sampleAssignees = [
    {
      name: "Test User",
      email: process.env.EMAIL_USER // Use your own email for testing
    }
  ];
  
  const assignedBy = {
    name: "Task Manager System",
    email: process.env.EMAIL_FROM || process.env.EMAIL_USER
  };
  
  try {
    console.log("Sending test assignment email...");
    await sendTaskAssignmentEmail({
      task: sampleTask,
      assignees: sampleAssignees,
      assignedBy
    });
    console.log("✅ Test assignment email sent successfully!");
  } catch (error) {
    console.error("❌ Failed to send test assignment email:", error.message);
  }
};

// Test sending a sample reminder email
const testReminderEmail = async () => {
  if (!await testEmailConfig()) return;
  
  const sampleTask = {
    title: "Test Task Reminder",
    description: "This is a test task reminder to verify email functionality",
    priority: "High",
    dueDate: new Date() // Due now
  };
  
  const sampleAssignees = [
    {
      name: "Test User", 
      email: process.env.EMAIL_USER // Use your own email for testing
    }
  ];
  
  const assignedBy = {
    name: "Task Manager System",
    email: process.env.EMAIL_FROM || process.env.EMAIL_USER
  };
  
  try {
    console.log("Sending test reminder email...");
    await sendTaskReminderEmail({
      task: sampleTask,
      assignees: sampleAssignees,
      assignedBy,
      message: "This is a test reminder email from your Task Manager system."
    });
    console.log("✅ Test reminder email sent successfully!");
  } catch (error) {
    console.error("❌ Failed to send test reminder email:", error.message);
  }
};

// Main test function
const runTests = async () => {
  console.log("=".repeat(50));
  console.log("EMAIL FUNCTIONALITY TEST");
  console.log("=".repeat(50));
  
  await testAssignmentEmail();
  console.log("");
  await testReminderEmail();
  
  console.log("\n" + "=".repeat(50));
  console.log("TEST COMPLETED");
  console.log("=".repeat(50));
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error("Test failed:", error);
    process.exit(1);
  });
}

module.exports = { testEmailConfig, testAssignmentEmail, testReminderEmail };