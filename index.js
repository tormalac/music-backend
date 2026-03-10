import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());

// --- ÚJ: Express limitek felemelése 50MB-ra ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Cloudinary konfiguráció
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- ÚJ: Multer limitek felemelése 50MB-ra ---
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB maximális fájlméret
});

// 🔼 Feltöltés (AUDIO / WAV fájlokhoz)
app.post("/upload", upload.single("file"), (req, res) => {
    try {
        console.log("=== Upload request ===");
        if (!req.file) {
            console.warn("Nincs kiválasztott fájl!");
            return res.status(400).json({ error: "Nincs kiválasztott fájl!" });
        }

        const fileBuffer = req.file.buffer;

        const uploadStream = cloudinary.uploader.upload_stream(
            { 
                resource_type: "video", // KÖTELEZŐ: A Cloudinary az audiót is ide sorolja!
                format: "wav"           // Erőszakkal megmondjuk neki, hogy ez egy WAV hangfájl
            }, 
            (error, result) => {
                if (error) {
                    console.error("Cloudinary hiba:", error);
                    return res.status(500).json({ error: error.message, raw: error });
                }

                console.log("Cloudinary feltöltve:", result);
                res.json({ url: result.secure_url, public_id: result.public_id });
            }
        );

        uploadStream.end(fileBuffer);

    } catch (error) {
        console.error("Catch error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 💾 Projekt (JSON) feltöltése
app.post("/upload-project", upload.single("file"), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nincs JSON fájl!" });

        const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: "raw" }, // A JSON fájlokhoz "raw" kell!
            (error, result) => {
                if (error) {
                    console.error("Cloudinary projekt mentés hiba:", error);
                    return res.status(500).json({ error: error.message });
                }
                res.json({ url: result.secure_url, public_id: result.public_id });
            }
        );

        uploadStream.end(req.file.buffer);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ❌ Törlés (Okosított verzió Audióhoz és JSON-hoz)
app.delete("/delete/:public_id", async (req, res) => {
    try {
        const pubId = req.params.public_id;
        
        // 1. Megpróbáljuk törölni, mintha Audió/Videó lenne (WAV fájlok)
        await cloudinary.uploader.destroy(pubId, { resource_type: "video" });
        
        // 2. Megpróbáljuk törölni, mintha nyers adat lenne (JSON fájlok)
        await cloudinary.uploader.destroy(pubId, { resource_type: "raw" });
        
        res.json({ message: "Fájl törölve a felhőből" });
    } catch (err) {
        console.error("Cloudinary törlés hiba:", err);
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


