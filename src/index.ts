import "dotenv/config";

import chalk from "chalk";
import express, { Request, Response } from "express";
import multer from "multer";

import { rename } from "fs/promises";

process.env.TZ = "Asia/Bangkok";

const app = express();
const upload = multer({ dest: "uploads/" });

const PASSWORD = process.env.PASSWORD;

if (!PASSWORD) {
  throw new Error("PASSWORD environment variable is not set");
}

const port = process.env.PORT;

if (!port) {
  throw new Error("PORT environment variable is not set");
}

function getIP(req: Request) {
  return req.headers["cf-connecting-ip"] || req.headers["x-real-ip"] || req.ip;
}

app.use((req, res, next) => {
  const time = new Date().toLocaleString("th");
  const ip = getIP(req);
  const method = req.method;
  const path = req.path;

  next();

  const statusCode = res.statusCode;

  const color = res.statusCode >= 400 ? chalk.yellow : chalk.green;

  console.log(color(`[${time}] ${ip} -> ${method} ${path} ${statusCode}`));
});

// Middleware to check if the provided password is correct
const checkPassword = (req: Request, res: Response, next: Function) => {
  const providedPassword = req.headers.authorization;

  if (providedPassword === PASSWORD) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
};

// File upload endpoint with password protection
app.post(
  "/upload",
  checkPassword,
  upload.single("file"),
  async (req: Request, res: Response) => {
    const uploadedFile = req.file;
    if (!uploadedFile) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    // Process the uploaded file, e.g., save it to the desired location
    // Example: move the file to the 'uploads' directory with a unique filename
    const destinationPath = `uploads/${uploadedFile.originalname}`;

    // Rename the temporary file to the destination path
    try {
      await rename(uploadedFile.path, destinationPath);
      res.status(200).json({
        message: "File uploaded and saved successfully",
        path: `/files/${uploadedFile.originalname}`,
      });

      console.log(
        chalk.magenta(
          `[${new Date().toLocaleString(
            "th"
          )}] File uploaded: ${destinationPath}`
        )
      );
    } catch (err) {
      console.error("Error moving file: ", err);
      res.status(500).json({ message: "Error moving file" });
    }
  }
);

// File serving endpoint
app.use("/files", express.static("uploads"));

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
