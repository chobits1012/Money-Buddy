const fs = require('fs');
const sharp = require('sharp');

async function processIcon(inputPath, outputPath, size) {
    try {
        console.log(`Processing ${inputPath}...`);
        
        let image = await sharp(inputPath).toBuffer();
        
        // 1. Trim the white background
        // Setting a high threshold to remove off-white and anti-aliased edges
        const trimmed = await sharp(image).trim({
            background: { r: 255, g: 255, b: 255, alpha: 255 },
            threshold: 15
        }).toBuffer();
        
        const trimmedImage = sharp(trimmed);
        const trimmedMeta = await trimmedImage.metadata();
        console.log("Trimmed metadata:", { w: trimmedMeta.width, h: trimmedMeta.height });

        // Calculate padding to make it square again
        const maxDim = Math.max(trimmedMeta.width, trimmedMeta.height);
        const padT = Math.floor((maxDim - trimmedMeta.height) / 2);
        const padB = Math.ceil((maxDim - trimmedMeta.height) / 2);
        const padL = Math.floor((maxDim - trimmedMeta.width) / 2);
        const padR = Math.ceil((maxDim - trimmedMeta.width) / 2);

        // 3. Process color and resize
        await trimmedImage
            // Pad into a square
            .extend({
                top: padT,
                bottom: padB,
                left: padL,
                right: padR,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            // Grayscale mix for lower saturation and warm tint lookup
            .recomb([
                [0.70, 0.20, 0.10],   // R
                [0.10, 0.70, 0.20],   // G
                [0.05, 0.15, 0.80]    // B
            ])
            .modulate({
                brightness: 0.95,
                saturation: 0.6,
            })
            // Finally resize back to correct PWA dimensions
            .resize(size, size, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toFile(outputPath);
            
        console.log(`Successfully output ${outputPath}`);
    } catch (err) {
        console.error(`Error processing ${inputPath}:`, err);
    }
}

async function run() {
    // Keep originals if they don't exist
    if (!fs.existsSync('public/pwa-192x192.orig.png')) {
        fs.copyFileSync('public/pwa-192x192.png', 'public/pwa-192x192.orig.png');
    }
    if (!fs.existsSync('public/pwa-512x512.orig.png')) {
        fs.copyFileSync('public/pwa-512x512.png', 'public/pwa-512x512.orig.png');
    }

    await processIcon('public/pwa-192x192.orig.png', 'public/pwa-192x192.png', 192);
    await processIcon('public/pwa-512x512.orig.png', 'public/pwa-512x512.png', 512);
}

run();
