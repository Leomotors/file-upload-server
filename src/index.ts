import "dotenv/config";

import chalk from "chalk";
import express, { Request, Response } from "express";
import multer from "multer";

import { rename, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

process.env.TZ = "Asia/Bangkok";

const app = express();
const upload = multer({
  dest: "uploads/",
  // https://stackoverflow.com/questions/72909624/multer-corrupts-utf8-filename-when-uploading-files
  fileFilter: (_, file, cb) => {
    file.originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );
    cb(null, true);
  },
});

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
  const pathDecoded = decodeURIComponent(path);

  const userAgent = req.headers["user-agent"];

  next();

  res.on("finish", () => {
    const statusCode = res.statusCode;

    if (path === "/" && userAgent?.startsWith("Uptime-Kuma/")) {
      if (req.headers.authorization === PASSWORD) {
        return;
      }

      console.log("Wild 熊ベア appeared!")
    }

    const color = res.statusCode >= 400 ? chalk.yellow : chalk.green;

    console.log(
      color(
        `[${time}] ${ip}\n\t${method} ${path}${path !== pathDecoded ? ` (${pathDecoded})` : ""
        } ${statusCode}\n\tUser-Agent: ${userAgent || "<undefined>"}\n`
      )
    );
  });
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

    const fileName =
      (typeof req.body.file_name === "string" && req.body.file_name) ||
      uploadedFile.originalname;

    // Process the uploaded file, e.g., save it to the desired location
    // Example: move the file to the 'uploads' directory with a unique filename
    const destinationPath = join("uploads", fileName);

    // Prevent directory traversal
    if (!destinationPath.startsWith(join("uploads"))) {
      res.status(400).json({ message: "Invalid file name" });
      return;
    }

    // Create the directory recursively
    try {
      await mkdir(dirname(destinationPath), { recursive: true });
    } catch (err) {
      console.error("Error creating directory: ", err);
      res.status(500).json({ message: "Error creating directory" });
      return;
    }

    // Rename the temporary file to the destination path
    try {
      await rename(uploadedFile.path, destinationPath);
      res.status(200).json({
        message: "File uploaded and saved successfully",
        path: `/files/${fileName}`,
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

app.get("*", (req, res) => {
  res.status(404).send("Not found");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
