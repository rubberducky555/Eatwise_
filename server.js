const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const path = require("path");

// Load environment variables from config folder
dotenv.config({ path: path.join(__dirname, 'config', '.env') });

// ✅ Load AI service AFTER env
const { askAI } = require("./services/ai.service.js");

console.log("Groq API Key Loaded:", !!process.env.GROQ_API_KEY);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

/* -------------------------
   FILE UPLOAD CONFIG
-------------------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

/* -------------------------
   MongoDB Connection
-------------------------- */
mongoose
  .connect(
    "mongodb+srv://eatwiseUser:EatWise123@cluster0.ejqhntm.mongodb.net/eatwise?retryWrites=true&w=majority"
  )
  .then(() => console.log("MongoDB connected ✅"))
  .catch(err => console.error("MongoDB error ❌", err));

/* -------------------------
   User Schema
-------------------------- */
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  name: String,
  age: Number,
  gender: String,
  height: Number,
  weight: Number,
  diseases: [String],
  profileCompleted: {
    type: Boolean,
    default: false
  }
});

const User = mongoose.model("User", userSchema);

/* -------------------------
   AUTH ROUTES
-------------------------- */

// ✅ SIGNUP (FORCE profileCompleted = false)
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      email,
      password: hashedPassword,
      profileCompleted: false // 🔒 FORCE clean state
    });

    res.json({
      success: true,
      profileCompleted: false
    });
  } catch {
    res.status(500).json({ message: "Signup failed" });
  }
});

// ✅ LOGIN (HARDENED)
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      success: true,
      profileCompleted: user.profileCompleted === true
    });
  } catch {
    res.status(500).json({ message: "Login failed" });
  }
});

// ✅ SAVE PROFILE DETAILS
app.post("/save-profile", async (req, res) => {
  try {
    const { email, name, age, gender, height, weight, diseases } = req.body;

    await User.findOneAndUpdate(
      { email },
      { name, age, gender, height, weight, diseases, profileCompleted: true },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: "Profile saved successfully" });
  } catch (err) {
    console.error("Save profile error:", err);
    res.status(500).json({ message: "Failed to save profile" });
  }
});

app.post("/get-profile", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      name: user.name,
      age: user.age,
      gender: user.gender,
      height: user.height,
      weight: user.weight,
      diseases: user.diseases || []
    });

  } catch {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});


/* -------------------------
   AI ROUTES (UNCHANGED)
-------------------------- */
app.post("/ask-ai", async (req, res) => {
  try {
    const { message } = req.body;
    const reply = await askAI(message);
    res.json({ reply });
  } catch {
    res.json({
      reply:
        "⚠️ Demo mode: AI quota exceeded. Real-time AI works when credits are available."
    });
  }
});

/* -------------------------
   IMAGE OCR + AI
-------------------------- */
function cleanOCRText(text) {
  return text
    .replace(/\n+/g, " ")
    .replace(/[^a-zA-Z0-9%,.() ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* -------------------------
   IMAGE OCR + AI ANALYSIS (CORE FEATURE)
-------------------------- */
app.post("/analyze-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ reply: "No image uploaded." });
    }

    console.log("📸 Image received:", req.file.originalname);

    // 1️⃣ OCR
    const ocrResult = await Tesseract.recognize(
      req.file.buffer,
      "eng"
    );

    const rawText = ocrResult.data.text;
    const extractedText = cleanOCRText(rawText);


    console.log("📝 OCR TEXT:\n", extractedText);

    // 2️⃣ AI REASONING PROMPT
    const prompt = `
You are an AI-native nutrition co-pilot.

STRICT RULES:
1. Output VALID JSON only.
2. Do not include markdown, or extra text.
3. Base analysis ONLY on provided label info if given.
4. Be honest, blunt, and non-marketing.
5. Use realistic nutrition estimates if exact values are missing.
6. Give a verdict at the end so that user becomes clear.

Return data in THIS EXACT JSON STRUCTURE:
{
  "product": {
    "name": "Classic Salted Potato Chips",
    "net_weight_g": 50,
    "category": "packaged snack"
  },

  "ingredients_analysis": {
    "ingredients": [
      {
        "name": "Potatoes",
        "comment": "Refined carb once fried, high glycemic impact"
      },
      {
        "name": "Edible vegetable oil (Palmolein)",
        "comment": "Refined palm oil, high in saturated fat"
      },
      {
        "name": "Salt",
        "comment": "Adds sodium, no nutritional value"
      }
    ],
    "summary": {
      "clean_label": true,
      "nutritional_quality": "weak"
    }
  },

  "nutrition": {
    "per_serving": {
      "serving_size_g": 30,
      "calories_kcal": 160,
      "carbs_g": 15,
      "sugar_g": 0,
      "protein_g": 2,
      "fat_g": 10,
      "saturated_fat_g": 3,
      "trans_fat_g": 0,
      "fiber_g": 1,
      "sodium_mg": 170
    },
    "entire_pack_estimate": {
      "calories_kcal": 270,
      "fat_g": 17,
      "saturated_fat_g": 5,
      "protein_g": 4
    },
    "macro_verdict": "High fat + refined carbs + low protein/fiber = junk calories"
  },

  "red_flags": [
    "Palmolein oil indicates poor fat quality",
    "High calorie density makes overeating easy",
    "Low satiety due to lack of protein and fiber",
    "Zero trans fat claim does not mean oxidation-free frying"
  ],

  "consumption_verdict": {
    "should_you_eat": "Yes, but only as junk food",
    "frequency": {
      "daily": "No",
      "weekly": "Only if overall diet is clean",
      "occasionally": "Acceptable"
    },
    "safe_amount_g": "20–30",
    "who_should_avoid": [
      "Weight-loss focused individuals",
      "Diabetics or insulin resistance",
      "People with heart health concerns",
      "Children (habit forming, poor nutrition)"
    ]
  },

  "timing_advice": {
    "best_time": [
      "Midday after a protein-rich meal",
      "After physical activity"
    ],
    "worst_time": [
      "Late night or before sleep",
      "Empty stomach",
      "As a meal replacement"
    ],
    "body_effects": [
      "Short energy spike",
      "Quick crash",
      "Encourages overeating",
      "No muscle recovery or satiety"
    ]
  },

  "final_health_decision": {
    "label": "Clean-label junk food",
    "summary":
      "Better than ultra-processed flavored chips, but still unhealthy. Consume rarely, in small portions."
  },

  "tracker_data": {
    "food": "Potato chips",
    "quantity_g": 30,
    "calories_kcal": 160,
    "protein_g": 2,
    "carbs_g": 15,
    "fat_g": 10
  }
}




Food label text:
${extractedText}
`;

    let reply;
    try {
      reply = await askAI(prompt);
    } catch {
      reply =
        "⚠️ Demo analysis: This product appears to contain mixed ingredients. Some may contribute to higher calories or sugar. Real-time AI analysis activates when credits are available.";
    }

    res.json({
      extractedText,
      reply
    });

  } catch (err) {
    console.error("Image analysis error:", err);
    res.json({
      reply:
        "Could not analyze the image. Please upload a clearer food label."
    });
  }
});


/* -------------------------
   SERVER START
-------------------------- */
app.listen(PORT, () =>
  console.log(`EatWise server running on port ${PORT} 🍏`)
);
