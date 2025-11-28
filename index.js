import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Cloudinary konfiguráció
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer: fájl memóriában
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🔼 Feltöltés
app.post("/upload", upload.single("file"), (req, res) => {
    try {
        const fileBuffer = req.file.buffer;

        const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: "raw" },
            (error, result) => {
                if (error) return res.status(500).json({ error });
                res.json({ url: result.secure_url, public_id: result.public_id });
            }
        );

        uploadStream.end(fileBuffer);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ❌ Törlés
app.delete("/delete/:public_id", async (req, res) => {
    try {
        await cloudinary.uploader.destroy(req.params.public_id, {
            resource_type: "raw"
        });
        res.json({ message: "Fájl törölve" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 📑 Duplikálás (fájl újrafeltöltése)
app.post("/duplicate", upload.single("file"), (req, res) => {
    try {
        const fileBuffer = req.file.buffer;
        const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: "raw" },
            (error, result) => {
                if (error) return res.status(500).json({ error });
                res.json({ url: result.secure_url, public_id: result.public_id });
            }
        );

        uploadStream.end(fileBuffer);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

