import express from "express";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import { readFileSync } from "fs";
import mammoth from "mammoth";
import { unlinkSync } from "fs";
import { v4 as uuidv4 } from "uuid";
import Document from "./schema/documentSchema.js";
import crypto from "crypto";
import User from "./schema/userSchema.js";
import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import http from "http";
import upload from "./config/mutler-cloudinary.js";
const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

//console.log(process.env.MONGO_URI);
mongoose
  .connect(`${process.env.MONGO_URI}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error(" MongoDB connection error:", err));

const PORT = process.env.PORT;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});

io.on("connection", (socket) => {
  console.log("✅ New client connected:", socket.id);

  socket.on("join-room", async (docId) => {
    socket.join(docId);
    console.log(`📂 User joined room: ${docId}`);

    try {
      let document = await Document.findById(docId);

      // If the document doesn't exist, create a new one
      if (!document) {
        document = new Document({ _id: docId, content: "" });
        await document.save();
      }

      // Send the document content to the user
      socket.emit("load-document", document.content);
    } catch (error) {
      console.error(" Error loading document:", error);
    }
  });

  socket.on("send-changes", (docId, delta) => {
    socket.to(docId).emit("receive-changes", delta);
  });

  socket.on("save-document", async (docId, content) => {
    try {
      await Document.findByIdAndUpdate(docId, { content });
    } catch (error) {
      console.error(" Error saving document:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(` Client disconnected: ${socket.id}`);
  });
});

function verifyJWT(req, res, next) {
  const token = req.cookies.access_token;
  if (!token) {
    //console.log("hah haha haha")
    return res.sendStatus(403);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.log("invalid token");
    return res.sendStatus(401);
  }
}

app.post("/documents", verifyJWT, async (req, res) => {
  try {
    const username = req.user.name; // Owner ID passed from the frontend
    const userId = req.user.userId;
    const { title } = req.body;
    console.log("title is ", title);
    if (!username) {
      return res.status(400).json({ error: "Owner ID is required" });
    }

    const docId = uuidv4();
    const newDocument = new Document({
      _id: docId,
      content: "",
      title: title,
      owner: username,
    });

    await newDocument.save();

    await User.findByIdAndUpdate(userId, { $push: { documents: docId } });

    res.status(201).json({ docId });
  } catch (error) {
    console.error(" Error creating document:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/users/register", async (req, res) => {
  try {
    const { name, password } = req.body;
    console.log("printing name", req.body);

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    let user = await User.findOne({ name });
    //console.log(user);

    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({ name, password: hashedPassword, _id: uuidv4() });
      await user.save();
    }
    const accessToken = jwt.sign(
      { userId: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Set the token in cookie
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      sameSite: "None",
      secure: true, // Must be true for SameSite=None in production
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res
      .status(200)
      .json({
        message: "User registered and logged in successfully",
        userId: user._id,
      });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  const { name, password } = req.body;
  const user = await User.findOne({ name });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = jwt.sign(
    { userId: user._id, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  // Set the token in cookie
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    sameSite: "None",
    secure: true, // Must be true for SameSite=None in production
    maxAge: 60 * 60 * 1000, // 1 hour
  });

  res.json({ message: "Login successful" });
});

app.get("/verify", verifyJWT, (req, res) => {
  return res.status(200).json({ userId: req.user.userId, name: req.user.name });
});

app.get("/me", verifyJWT, (req, res) => {
  res.json({ userId: req.user.userId, name: req.user.name });
});

//to get all documents of the user
app.get("/users/:id/documents", verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("documents");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user.documents);
  } catch (error) {
    console.error(" Error fetching user's documents:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/documents/:id/title", verifyJWT, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const updatedDocument = await Document.findByIdAndUpdate(
      req.params.id,
      { title, lastUpdated: new Date() }, // Update title and lastUpdated field
      { new: true } // Return the updated document
    );

    if (!updatedDocument) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(updatedDocument);
  } catch (error) {
    console.error(" Error updating title:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// app.post("/upload-docx", verifyJWT, upload.single("file"), async (req, res) => {
//   try {
//     console.log("Entered upload-docx");
//     const username = req.user.name;
//     const { title } = req.body;

//     if (!username || !title || !req.file) {
//       return res.status(400).json({ error: "Missing required fields." });
//     }

//     // Log the uploaded file details properly
//     console.log("Uploaded file details:", {
//       originalname: req.file.originalname,
//       mimetype: req.file.mimetype,
//       size: req.file.size,
//       url: req.file.path, // Cloudinary URL
//       cloudinaryDetails: req.file, // Full Cloudinary response
//     });

//     // Get the Cloudinary URL (secure_url is preferred)
//     const fileUrl = req.file.secure_url || req.file.url;
//     console.log("Cloudinary file URL:");

//     // Download the file from Cloudinary
//     const response = await fetch(fileUrl);
//     if (!response.ok) {
//       console.error("Failed to fetch file from Cloudinary:", response.status, await response.text());
//       return res.status(500).json({ error: "Failed to fetch file from Cloudinary" });
//     }

//     const docxBuffer = await response.arrayBuffer();

//     let result;
//     try {
//       result = await mammoth.extractRawText({ buffer: Buffer.from(docxBuffer) });
//     } catch (err) {
//       console.error("Failed to extract text from DOCX:", err);
//       return res.status(500).json({ error: "Invalid DOCX file" });
//     }

//     const deltaContent = {
//       ops: [{ insert: result.value + "\n" }],
//     };

//     const docId = uuidv4();
//     const newDocument = new Document({
//       _id: docId,
//       content: deltaContent,
//       title: title,
//       owner: username,
//     });

//     await newDocument.save();
//     await User.findOneAndUpdate({ name: username }, { $push: { documents: docId } });

//     res.status(201).json({ docId, message: "Document uploaded and saved successfully." });
//   } catch (error) {
//     console.error("Error processing DOCX file:", error.message);
//     res.status(500).json({ error: "Failed to process file." });
//   }
// });

app.post(
  "/upload-docx",
  verifyJWT,
  (req, res, next) => {
    //console.log("Before upload.single");
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Multer/Cloudinary Error Object:", err);
        return res.status(400).json({
          error: "File upload failed",
          details: err.message,
        });
      }
      //console.log("After upload.single");
      next();
    });
  },
  async (req, res) => {
    try {
      //console.log("Entered upload-docx");
      const username = req.user.name;
      const { title } = req.body;

      if (!username || !title || !req.file) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      // Log the uploaded file details properly
      console.log("Uploaded file details:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: req.file.path, // Cloudinary URL
        cloudinaryDetails: req.file, // Full Cloudinary response
      });

      // Get the Cloudinary URL (secure_url is preferred)
      const fileUrl = req.file?.path;
      if (!fileUrl) {
        console.error("No valid Cloudinary URL found in req.file");
        return res
          .status(500)
          .json({ error: "Invalid Cloudinary upload response" });
      }
      //console.log("Cloudinary file URL:", fileUrl);

      // ✅ Fetch and process the .docx file
      const response = await fetch(fileUrl);
      if (!response.ok) {
        console.error(
          "Failed to fetch file from Cloudinary:",
          response.status,
          await response.text()
        );
        return res
          .status(500)
          .json({ error: "Failed to fetch file from Cloudinary" });
      }

      const docxBuffer = await response.arrayBuffer();

      let result;
      try {
        result = await mammoth.extractRawText({
          buffer: Buffer.from(docxBuffer),
        });
      } catch (err) {
        console.error("Failed to extract text from DOCX:", err);
        return res.status(500).json({ error: "Invalid DOCX file" });
      }

      const deltaContent = {
        ops: [{ insert: result.value + "\n" }],
      };

      const docId = uuidv4();
      const newDocument = new Document({
        _id: docId,
        content: deltaContent,
        title: title,
        owner: username,
      });

      await newDocument.save();
      await User.findOneAndUpdate(
        { name: username },
        { $push: { documents: docId } }
      );

      res
        .status(201)
        .json({ docId, message: "Document uploaded and saved successfully." });
    } catch (error) {
      console.error("Error processing DOCX file:", error.message);
      res.status(500).json({ error: "Failed to process file." });
    }
  }
);

app.post("/documents/:id/share", verifyJWT, async (req, res) => {
  try {
    const { permission } = req.body;
    if (!["view", "edit"].includes(permission)) {
      return res.status(400).json({ error: "Invalid permission type" });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Generate a unique link ID
    const linkId = crypto.randomBytes(8).toString("hex");

    // Store the shared link
    document.sharedLinks.push({ linkId, permission });
    await document.save();

    const sharedURL = `${process.env.FRONTEND_URL}/documents/shared/${linkId}`;
    res.json({ message: "Shareable link generated", sharedURL, permission });
  } catch (error) {
    console.error(" Error generating shareable link:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/documents/shared/:linkId", verifyJWT, async (req, res) => {
  try {
    const { linkId } = req.params;
    const userId = req.user.userId; // assuming user is authenticated

    const document = await Document.findOne({ "sharedLinks.linkId": linkId });
    if (!document) {
      return res.status(404).json({ error: "Invalid or expired link" });
    }

    const sharedLink = document.sharedLinks.find(
      (link) => link.linkId === linkId
    );

    // If user is logged in, add to sharedWith
    if (userId) {
      const alreadyShared = document.sharedWith.find(
        (entry) => entry.userId === userId
      );

      if (!alreadyShared) {
        document.sharedWith.push({
          userId,
          permission: sharedLink.permission,
        });
        await document.save();
      }
    }

    res.json({ document, permission: sharedLink.permission });
  } catch (error) {
    console.error(" Error accessing shared document:", error);
    res.status(500).json({ error: "Server error" });
  }
});
app.put("/documents/shared/:linkId", verifyJWT, async (req, res) => {
  try {
    const { linkId } = req.params;
    const { content } = req.body;

    const document = await Document.findOne({ "sharedLinks.linkId": linkId });
    if (!document) {
      return res.status(404).json({ error: "Invalid or expired link" });
    }

    const sharedLink = document.sharedLinks.find(
      (link) => link.linkId === linkId
    );

    if (sharedLink.permission !== "edit") {
      return res
        .status(403)
        .json({ error: "You do not have permission to edit this document" });
    }

    document.content = content;
    document.lastUpdated = new Date();
    await document.save();

    res.json({ message: "Document updated successfully" });
  } catch (error) {
    console.error(" Error updating shared document:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/documents/:id", verifyJWT, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(document);
  } catch (error) {
    console.error(" Error fetching document:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/users/names", verifyJWT, async (req, res) => {
  const ids = req.query.ids?.split(",") || [];
  try {
    const users = await User.find({ _id: { $in: ids } }).select("_id name");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch names" });
  }
});

app.put("/documents/:id", verifyJWT, async (req, res) => {
  try {
    const { content } = req.body;
    const updatedDocument = await Document.findByIdAndUpdate(
      req.params.id,
      { content },
      { new: true } // Returns the updated document
    );
    if (!updatedDocument) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(updatedDocument);
  } catch (error) {
    console.error(" Error updating document:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/documents/shared-with-me", verifyJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    const sharedDocs = await Document.find({ "sharedWith.userId": userId });

    res.json(sharedDocs);
  } catch (error) {
    console.error(" Error fetching shared documents:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/documents/:id/shared-users", verifyJWT, async (req, res) => {
  try {
    const docId = req.params.id;
    const document = await Document.findById(docId);
    if (!document) return res.status(404).json({ error: "Document not found" });
    //console.log("hello",document.owner.toString(), req.user.name);
    if (document.owner.toString() !== req.user.name) {
      return res
        .status(403)
        .json({ error: "Only owner can view shared users" });
    }

    res.json(document.sharedWith);
  } catch (error) {
    console.error("Error fetching shared users:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/logout", (req, res) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    sameSite: "None",
    secure: true,
  });
  return res.json({ message: "Logged out successfully" });
});

app.delete("/documents/:id", verifyJWT, async (req, res) => {
  try {
    const deletedDocument = await Document.findByIdAndDelete(req.params.id);
    if (!deletedDocument) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error(" Error deleting document:", error);
    res.status(500).json({ error: "Server error" });
  }
});
