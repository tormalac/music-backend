
import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs"; // <-- ÚJ: Fájlrendszer kezeléséhez

dotenv.config();
const app = express();
app.use(cors({
    origin: '*', // Mindent átenged, még a 'null' origint is
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- ÚJ: RAM-barát Disk Storage ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/tmp'); // A Render Linux alapú, a /tmp tökéletes ideiglenes mappa
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 200 * 1024 * 1024 } // Limit felemelve 200 MB-ra!
});

// 🔼 Feltöltés (AUDIO / WAV fájlokhoz)
app.post("/upload", upload.single("file"), (req, res) => {
    try {
        console.log("=== Upload request ===");
        if (!req.file) {
            console.warn("Nincs kiválasztott fájl!");
            return res.status(400).json({ error: "Nincs kiválasztott fájl!" });
        }

        // VISSZATÉRÜNK A "VIDEO" TÍPUSHOZ (Mert annak 100 MB a limitje!)
        cloudinary.uploader.upload_large(req.file.path, {
            resource_type: "video", 
            chunk_size: 6000000
            // FONTOS: KIVETTÜK A 'format: "wav"' SORT!
            // Így a Cloudinary nem próbálja meg átkódolni a hatalmas fájlt, 
            // hanem szó nélkül elmenti eredeti állapotában.
        }, (error, result) => {
            
            // Temp fájl törlése
            import('fs').then(fs => {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error("Nem sikerült törölni a temp fájlt:", err);
                });
            });

            if (error) {
                console.error("Cloudinary hiba:", error);
                return res.status(500).json({ error: error.message, raw: error });
            }

            console.log("Cloudinary feltöltve:", result.secure_url);
            res.json({ url: result.secure_url, public_id: result.public_id });
        });

    } catch (error) {
        console.error("Catch error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 💾 Projekt (JSON) feltöltése
app.post("/upload-project", upload.single("file"), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nincs JSON fájl!" });

        cloudinary.uploader.upload(req.file.path, {
            resource_type: "raw" 
        }, (error, result) => {
            
            // Temp fájl törlése
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Nem sikerült törölni a temp fájlt:", err);
            });

            if (error) {
                console.error("Cloudinary projekt mentés hiba:", error);
                return res.status(500).json({ error: error.message });
            }
            res.json({ url: result.secure_url, public_id: result.public_id });
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ❌ Törlés (Marad az eredeti szuper verziód)
app.delete("/delete/:public_id", async (req, res) => {
    try {
        const pubId = req.params.public_id;
        await cloudinary.uploader.destroy(pubId, { resource_type: "video" });
        await cloudinary.uploader.destroy(pubId, { resource_type: "raw" });
        res.json({ message: "Fájl törölve a felhőből" });
    } catch (err) {
        console.error("Cloudinary törlés hiba:", err);
        res.status(500).json({ error: err.message });
    }
});

// 📑 Duplikálás
app.post("/duplicate", upload.single("file"), (req, res) => {
    try {
        cloudinary.uploader.upload(req.file.path, {
            resource_type: "raw"
        }, (error, result) => {
            
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Nem sikerült törölni a temp fájlt:", err);
            });

            if (error) return res.status(500).json({ error });
            res.json({ url: result.secure_url, public_id: result.public_id });
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));




