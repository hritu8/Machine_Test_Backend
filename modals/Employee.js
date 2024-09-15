const mongoose = require("mongoose");
const { Schema } = mongoose;

// Define the schema for employee data
const employeeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    mobileNo: {
      type: String,
      required: true,
      match: [/^\d{10,}$/, "Mobile No must be at least 10 digits"],
    },
    designation: {
      type: String,
      enum: ["HR", "Manager", "Sales"],
      required: true,
    },
    gender: {
      type: String,
      enum: ["M", "F"],
      required: true,
    },
    course: {
      type: [String],
      enum: ["MCA", "BCA", "BSC"],
      required: true,
    },
    imgUpload: {
      type: String, // Store the path of the uploaded image
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Create the model
const Employee = mongoose.model("employees", employeeSchema);

module.exports = Employee;
