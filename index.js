const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const UserModel = require("./modals/User");
const Employee = require("./modals/Employee");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();
const fs = require("fs");

const cloudinary = require("cloudinary").v2;

// User loginconst jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); // To hash passwords

// Secret key for JWT
const JWT_SECRET = "your_secret_key"; // Replace with a strong secret key

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/Machine_Test");
// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Adjust the upload directory as needed
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// User login
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  UserModel.findOne({ email })
    .then((user) => {
      if (!user) {
        return res.status(401).json("Invalid credentials");
      }

      // Compare hashed password
      bcrypt.compare(password, user.password).then((isMatch) => {
        if (!isMatch) {
          return res.status(401).json("Invalid credentials");
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: user._id, email: user.email },
          JWT_SECRET,
          {
            expiresIn: "1h", // Token expires in 1 hour
          }
        );

        // Send token to the client
        res.json({ message: "Logged in successfully", token });
      });
    })
    .catch((err) => {
      res.status(500).json({ message: "Something went wrong", error: err });
    });
});

// User registration
app.post("/register", (req, res) => {
  const { email, password, name } = req.body;

  // Hash the password before saving the user
  bcrypt.hash(password, 10).then((hashedPassword) => {
    UserModel.create({
      name,
      email,
      password: hashedPassword, // Save the hashed password
    })
      .then((user) => {
        // Generate JWT token upon successful registration

        const token = jwt.sign(
          { id: user._id, email: user.email },
          JWT_SECRET,
          {
            expiresIn: "1h", // Token expires in 1 hour
          }
        );

        // Send token to the client
        res.json({ message: "User registered successfully", token });
      })
      .catch((err) => res.status(400).json(err));
  });
});

// Add employee route with image upload handling
app.post("/addEmployee", upload.single("imgUpload"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Image file is required" });
  }

  try {
    const result = await cloudinary.uploader.upload(req.file.path);

    const employeeData = {
      ...req.body,
      imgUpload: result.secure_url, // Cloudinary URL
    };

    // Remove local file after upload
    fs.unlinkSync(req.file.path);

    const employee = await Employee.create(employeeData);
    res.json(employee);
  } catch (error) {
    console.error("Error uploading image to Cloudinary", error);
    res.status(500).json({ message: "Error uploading image", error });
  }
});

app.get("/getEmployee", (req, res) => {
  Employee.find()
    .then((employees) => {
      res.json(employees);
    })
    .catch((err) => res.status(500).json(err));
});

// DELETE employee by ID
app.delete("/deleteEmployee", async (req, res) => {
  try {
    const { id } = req.body; // Extract ID from request body

    // Check if ID is provided and valid
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    // Find and delete the employee
    const result = await Employee.findByIdAndDelete(id);

    // If no employee is found
    if (!result) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Success response
    res
      .status(200)
      .json({ message: "Employee deleted successfully", data: result });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
});

app.get("/edit/:id", (req, res) => {
  const { id } = req.params;

  Employee.findById(id)
    .then((employee) => {
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    })
    .catch((err) => res.status(500).json(err));
});

// Update employee route
app.put("/edit/:id", upload.single("imgUpload"), async (req, res) => {
  const { id } = req.params;

  try {
    // Find the employee to be updated
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const updateData = { ...req.body };

    // Check if a new file was uploaded
    if (req.file) {
      // Upload new image to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path);
      updateData.imgUpload = result.secure_url; // Update imgUpload with new Cloudinary URL

      // Remove local file after upload
      fs.unlinkSync(req.file.path);
    }

    // Update the employee document
    const updatedEmployee = await Employee.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    res.json(updatedEmployee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating employee", error });
  }
});

// PUT route for updating employee status
app.put("/edit/status/:id", upload.none(), async (req, res) => {
  try {
    const { id } = req.params; // Extract ID from URL parameters
    const { status } = req.body; // Extract status from form data

    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    // Find and update the employee's status
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    employee.status = status; // Update status
    await employee.save(); // Save the updated employee

    res.status(200).json({
      message: "Employee status updated successfully",
      data: employee,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
});
// Start the server
app.listen(3001, () => {
  console.log("Server running on port 3001");
});
