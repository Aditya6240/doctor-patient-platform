const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/doctor-patient-app",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Doctor Schema with geospatial indexing
const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    specialization: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
  },
  { timestamps: true }
);

// Create geospatial index
doctorSchema.index({ location: "2dsphere" });

const Doctor = mongoose.model("Doctor", doctorSchema);

// Routes

// Add a new doctor
app.post("/api/doctors", async (req, res) => {
  try {
    const { name, specialization, phone, address, latitude, longitude } =
      req.body;

    const doctor = new Doctor({
      name,
      specialization,
      phone,
      address,
      location: {
        type: "Point",
        coordinates: [longitude, latitude], // MongoDB uses [lng, lat] format
      },
    });

    await doctor.save();
    res.status(201).json({ success: true, doctor });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get all doctors
app.get("/api/doctors", async (req, res) => {
  try {
    const doctors = await Doctor.find();
    console.log(`Retrieved ${doctors.length} doctors from database`);
    res.json({ success: true, doctors, count: doctors.length });
  } catch (error) {
    console.error("Error getting all doctors:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test route to check database connection and geospatial index
app.get("/api/test", async (req, res) => {
  try {
    const count = await Doctor.countDocuments();
    const indexes = await Doctor.collection.getIndexes();

    res.json({
      success: true,
      message: "Database connected successfully",
      doctorCount: count,
      indexes: Object.keys(indexes),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search doctors by location (using $near)
app.get("/api/doctors/search", async (req, res) => {
  try {
    const { lat, lng, maxDistance = 10000 } = req.query; // maxDistance in meters

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ success: false, error: "Latitude and longitude are required" });
    }

    console.log(
      `Searching for doctors near lat: ${lat}, lng: ${lng}, maxDistance: ${maxDistance}`
    );

    const doctors = await Doctor.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(maxDistance),
        },
      },
    });

    console.log(`Found ${doctors.length} doctors nearby`);
    res.json({ success: true, doctors, count: doctors.length });
  } catch (error) {
    console.error("Error in nearby search:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search doctors within a specific area/city (using text search on address)
app.get("/api/doctors/location/:location", async (req, res) => {
  try {
    const { location } = req.params;
    console.log(`Searching for doctors in location: ${location}`);

    const doctors = await Doctor.find({
      address: { $regex: location, $options: "i" },
    });

    console.log(`Found ${doctors.length} doctors in ${location}`);
    res.json({ success: true, doctors, count: doctors.length });
  } catch (error) {
    console.error("Error in location search:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Advanced search using $geoWithin for area-based search
app.post("/api/doctors/search-area", async (req, res) => {
  try {
    const { bounds } = req.body; // bounds should contain sw and ne lat/lng

    if (!bounds || !bounds.sw || !bounds.ne) {
      return res
        .status(400)
        .json({ success: false, error: "Bounds are required" });
    }

    // Create a bounding box polygon
    const polygon = {
      type: "Polygon",
      coordinates: [
        [
          [bounds.sw.lng, bounds.sw.lat], // SW
          [bounds.ne.lng, bounds.sw.lat], // SE
          [bounds.ne.lng, bounds.ne.lat], // NE
          [bounds.sw.lng, bounds.ne.lat], // NW
          [bounds.sw.lng, bounds.sw.lat], // Close polygon
        ],
      ],
    };

    const doctors = await Doctor.find({
      location: {
        $geoWithin: {
          $geometry: polygon,
        },
      },
    });

    console.log(`Found ${doctors.length} doctors within bounds`);
    res.json({ success: true, doctors, count: doctors.length });
  } catch (error) {
    console.error("Error in area search:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all doctors with geospatial data
app.get("/api/doctors/with-location", async (req, res) => {
  try {
    const doctors = await Doctor.find({
      location: { $exists: true },
    });

    res.json({ success: true, doctors, count: doctors.length });
  } catch (error) {
    console.error("Error getting doctors with location:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("MongoDB connected successfully");
});
