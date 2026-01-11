// Migration script to update existing reports with reportType field
// Run this once to add reportType: "post" to all existing reports

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function migrateReports() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const reportsCollection = db.collection("reports");

    // Update all reports that don't have reportType field
    const result = await reportsCollection.updateMany(
      { reportType: { $exists: false } },
      { $set: { reportType: "post" } }
    );

    console.log(`Migration complete: Updated ${result.modifiedCount} reports`);
    
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateReports();
