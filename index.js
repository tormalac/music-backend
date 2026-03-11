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
