const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Serve the local directory so the page can access images
    const express = require('express');
    const app = express();
    app.use(express.static('public'));
    const server = app.listen(0, async () => {
        const port = server.address().port;
        
        // Give Chrome permissions to download automatically
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: path.resolve('public')
        });

        await page.goto(`http://localhost:${port}/process.html`, { waitUntil: 'networkidle0' });
        
        // Let it run the script
        await new Promise(r => setTimeout(r, 3000));
        
        server.close();
        await browser.close();
        console.log("Done running puppeteer");
    });
})();
