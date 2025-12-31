const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const getHTML = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SENURA-MD PAIRING</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap');
        body { font-family: 'Poppins', sans-serif; background: radial-gradient(circle, #1e3a8a 0%, #0f172a 100%); color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; overflow: hidden; }
        .container { background: rgba(255, 255, 255, 0.05); padding: 40px; border-radius: 20px; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.1); text-align: center; width: 100%; max-width: 400px; animation: fadeIn 1.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        h1 { color: #60a5fa; font-size: 32px; letter-spacing: 3px; margin-bottom: 5px; text-shadow: 0 0 15px rgba(96, 165, 250, 0.6); }
        p { font-size: 14px; margin-bottom: 25px; opacity: 0.7; }
        input { width: 100%; padding: 15px; margin-bottom: 20px; border: none; border-radius: 12px; background: rgba(255, 255, 255, 0.1); color: white; font-size: 16px; outline: none; box-sizing: border-box; transition: 0.3s; border: 1px solid transparent; text-align: center; }
        input:focus { border: 1px solid #60a5fa; background: rgba(255, 255, 255, 0.15); }
        button { background: #2563eb; color: white; border: none; padding: 15px; border-radius: 12px; cursor: pointer; font-size: 16px; width: 100%; font-weight: 600; transition: 0.4s; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4); }
        button:hover { background: #3b82f6; transform: scale(1.02); }
        .code-box { font-size: 40px; font-weight: bold; color: #22c55e; letter-spacing: 8px; margin: 20px 0; padding: 15px; border: 2px dashed #60a5fa; border-radius: 10px; background: rgba(0,0,0,0.2); position: relative; }
        .timer { font-size: 18px; color: #f87171; margin-top: 10px; font-weight: bold; }
        .copy-btn { background: #64748b; margin-top: 10px; font-size: 14px; padding: 10px; border-radius: 8px; width: auto; display: inline-block; padding: 10px 20px; }
    </style>
</head>
<body>
    <div class="container">
        ${content}
    </div>
    <script>
        function copyCode() {
            const code = document.getElementById('pairCode').innerText;
            navigator.clipboard.writeText(code);
            const btn = document.querySelector('.copy-btn');
            btn.innerText = "COPIED!";
            btn.style.background = "#22c55e";
        }
        let timeLeft = 30;
        const timerElement = document.getElementById('timer');
        if(timerElement) {
            const countdown = setInterval(() => {
                timeLeft--;
                timerElement.innerText = timeLeft;
                if(timeLeft <= 0) {
                    clearInterval(countdown);
                    timerElement.innerText = "EXPIRED";
                    setTimeout(() => window.location.href = "/", 1000);
                }
            }, 1000);
        }
    </script>
</body>
</html>
`;

app.get('/', (req, res) => {
    res.send(getHTML(`
        <h1>SENURA-MD</h1>
        <p>Enter your WhatsApp Number with Country Code</p>
        <form action="/get-code" method="GET">
            <input type="text" name="number" placeholder="947xxxxxxxx" required>
            <button type="submit">GENERATE PAIRING CODE</button>
        </form>
    `));
});

app.get('/get-code', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.redirect('/');

    if (fs.existsSync('./session')) fs.rmSync('./session', { recursive: true, force: true });
    const { state } = await useMultiFileAuthState('./session');

    try {
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: "fatal" }),
        });

        if (!sock.authState.creds.registered) {
            await delay(1500);
            num = num.replace(/[^0-9]/g, '');
            const code = await sock.requestPairingCode(num);
            
            res.send(getHTML(`
                <h1>SENURA-MD</h1>
                <p>Your Pairing Code is Ready</p>
                <div class="code-box" id="pairCode">${code}</div>
                <button class="copy-btn" onclick="copyCode()">COPY CODE</button>
                <div class="timer">Expires in <span id="timer">30</span>s</div>
            `));
        }
    } catch (e) {
        res.send(getHTML(`<h1>Error</h1><p>Something went wrong. Please try again.</p><a href="/" style="color:#60a5fa">Go Back</a>`));
    }
});

app.listen(PORT, () => console.log(`SENURA-MD is live on port ${PORT}`));
