const express = require('express');
const youtubedl = require('yt-dlp-exec'); // Mantendo yt-dlp-exec como no package.json
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3001;

// Caminho para o arquivo que armazena o contador de downloads
const downloadCountFile = path.join(__dirname, 'downloads/count.txt');

// Inicializar o contador de downloads
let downloadCount = 0;

// Verificar se o arquivo do contador existe, se não, criar um
if (fs.existsSync(downloadCountFile)) {
    downloadCount = parseInt(fs.readFileSync(downloadCountFile, 'utf8')) || 0;
}

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'src/public')));

app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'src/public', 'index.html');
    res.sendFile(indexPath);
});

// Rota para obter o contador de downloads
app.get('/downloads/count', (req, res) => {
    res.json({ count: downloadCount });
});

app.get('/download', async (req, res) => {
    const url = req.query.url;
    const format = req.query.format;

    console.log(URL: ${url});
    console.log(Format: ${format});

    if (!url || !format || !['mp4', 'wav', 'mp3'].includes(format)) {
        return res.status(400).send('Formato não suportado. Use mp4, wav ou mp3.');
    }

    try {
        // Usando yt-dlp-exec para obter informações sobre o vídeo
        const info = await youtubedl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true
        });

        const title = info.title.replace(/[^a-zA-Z0-9 ]/g, '');
        let outputFilename = ${title}.${format};
        let outputPath = path.resolve(__dirname, 'downloads', outputFilename);

        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }

        // Baixar o vídeo ou áudio com yt-dlp-exec
        if (format === 'mp4') {
            await youtubedl(url, {
                format: 'bestvideo+bestaudio',
                mergeOutputFormat: 'mp4',
                output: outputPath
            });
        } else {
            const tempPath = path.resolve(__dirname, 'downloads', 'download.m4a');
            await youtubedl(url, {
                format: 'bestaudio',
                output: tempPath
            });

            const ffmpegCommand = spawn('ffmpeg', ['-i', tempPath, format === 'wav' ? outputPath : outputPath.replace(/\.wav$/, '.mp3'), '-y']);
            ffmpegCommand.on('close', () => {
                res.download(outputPath, outputFilename, (err) => {
                    if (!err) {
                        fs.unlinkSync(outputPath);
                        fs.unlinkSync(tempPath);
                        // Incrementar o contador de downloads
                        downloadCount++;
                        fs.writeFileSync(downloadCountFile, downloadCount.toString());
                    }
                });
            });
            return;
        }

        res.download(outputPath, outputFilename, (err) => {
            if (!err) {
                fs.unlinkSync(outputPath);
                // Incrementar o contador de downloads
                downloadCount++;
                fs.writeFileSync(downloadCountFile, downloadCount.toString());
            }
        });
    } catch (error) {
        console.error(Erro ao processar o download: ${error.message});
        return res.status(500).send('Erro ao processar o download');
    }
});

app.listen(port, () => {
    console.log(Servidor rodando em http://localhost:${port});
});






<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Downloader by PORTO</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap" rel="stylesheet">
    <style type="text/css">
        * {
            cursor: url(https://cur.cursors-4u.net/cursors/cur-11/cur1054.cur), auto !important;
            font-family: 'Montserrat', sans-serif;
        }

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            color: #e0e0e0;
            flex-direction: column;
            overflow: hidden;
            position: relative;
            background: rgba(0, 0, 0, 0.6) url('/mnt/data/image.png') no-repeat center center; 
            background-size: cover; 
            z-index: 0;
        }

        body::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.6); 
            backdrop-filter: blur(20px); 
            z-index: 0;
        }

        .container {
            background-color: rgba(30, 30, 30, 0.9);
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.7);
            text-align: center;
            width: 100%;
            max-width: 400px;
            box-sizing: border-box;
            overflow: hidden; 
            transition: all 0.5s ease-in-out;
            position: relative;
            z-index: 1; 
        }

        .download-count {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(60, 60, 60, 0.8);
            padding: 10px;
            border-radius: 8px;
            font-size: 18px;
            color: #e0e0e0;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            z-index: 10; /* Colocar acima do container */
        }

        .download-count .count-text {
            transition: transform 0.3s ease-in-out;
        }

        .container.error {
            animation: shake 0.5s;
            background-color: #ff4d4d; 
            color: white;
        }

        .error-message {
            display: none;
            color: white;
            margin-top: 10px;
        }

        .error .error-message {
            display: block;
        }

        @keyframes shake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            50% { transform: translateX(5px); }
            75% { transform: translateX(-5px); }
            100% { transform: translateX(0); }
        }

        .video-info {
            display: none; 
        }

        .video-info img {
            width: 100%; 
            aspect-ratio: 16/9; 
            object-fit: cover; 
            border-radius: 10px; 
            margin-bottom: 10px; 
        }

        .video-info h3 {
            margin: 10px 0;
            font-size: 18px;
            color: #e0e0e0;
        }

        .video-info.show {
            display: block;
            opacity: 1;
            transform: translateY(0);
        }

        input[type="text"] {
            width: 100%;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 5px;
            border: 1px solid #333;
            background-color: #2c2c2c;
            color: #e0e0e0;
            box-sizing: border-box;
            text-align: center;
            autocomplete: off;
        }

        input[type="text"]::-webkit-autofill,
        input[type="text"]::-webkit-autofill:hover,
        input[type="text"]::-webkit-autofill:focus,
        input[type="text"]::-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px #2c2c2c inset !important;
            -webkit-text-fill-color: #e0e0e0 !important;
        }

        .format-selector {
            display: flex;
            justify-content: space-around;
            margin-bottom: 10px;
            transition: margin-top 0.5s ease-in-out;
        }

        .format-button {
            padding: 10px 20px;
            border-radius: 50px;
            border: 1px solid #333;
            background-color: #2c2c2c;
            color: #e0e0e0;
            cursor: pointer;
            width: 70px;
            text-align: center;
            transition: transform 0.1s ease-in-out, background-color 0.3s ease;
        }

        .format-button:hover {
            transform: translateY(2px);
        }

        .format-button.selected {
            background-color: #4caf50;
            color: white;
            transform: translateY(2px);
        }

        button {
            padding: 10px;
            margin-top: 10px;
            border-radius: 5px;
            border: none;
            width: 100%;
            cursor: pointer;
            background-color: #6200ea;
            color: #e0e0e0;
            transition: all 0.5s ease-in-out; 
            transform: translateY(0); 
        }

        button.hidden {
            transform: translateY(100%); 
            opacity: 0; 
        }

        button:disabled {
            background-color: #444;
            color: #777;
            cursor: not-allowed;
        }

        .logo {
            display: block;
            margin: 50px auto 0 auto;
            width: 300px;
            height: auto;
            opacity: 0.8;
        }

        .container.move-up {
            transform: translateY(-50px);
        }

        /* Estilos do Pop-up */
        .popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 100;
        }

        .popup {
            background-color: #333;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.7);
            max-width: 500px;
            text-align: center;
            color: #e0e0e0;
            animation: fadeIn 0.5s ease;
        }

        .popup h2 {
            font-size: 24px;
            margin-bottom: 10px;
            color: #4caf50;
        }

        .popup p {
            font-size: 16px;
            margin-bottom: 20px;
        }

        .popup button {
            background-color: #4caf50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s ease;
        }

        .popup button:hover {
            background-color: #45a049;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: scale(0.9);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
    </style>
</head>
<body>
    <div class="container" id="container">
        <div class="video-info" id="videoInfo">
            <img id="videoThumbnail" src="" alt="Thumbnail">
            <h3 id="videoTitle"></h3>
        </div>
        <form id="downloadForm" action="/download" method="get" onsubmit="startDownload(event)">
            <input type="text" name="url" id="videoUrl" placeholder="Insira a URL do YouTube" autocomplete="off" required>
            <input type="hidden" id="selectedFormat" name="format" value="mp4"> <!-- Campo oculto para o formato -->
            <div class="format-selector" id="formatSelector">
                <button type="button" class="format-button selected" data-format="mp4">MP4</button>
                <button type="button" class="format-button" data-format="mp3">MP3</button>
                <button type="button" class="format-button" data-format="wav">WAV</button>
            </div>
            <button type="submit" id="downloadButton">Download</button>
        </form>
        <p class="error-message" id="errorMessage">Oops, URL inválida</p>
    </div>

    <img src="../logo.png" alt="Logo" class="logo">
    <div class="download-count" id="downloadCount">
        <span class="count-text">Total de downloads: 0</span>
    </div>

    <!-- Pop-up Lindo -->
    <div class="popup-overlay" id="popupOverlay">
        <div class="popup">
            <h2>E aí, beleza?</h2>
            <p>Este é um desenvolvimento solo, sem fins lucrativos, sem anúncios e sem parafernalhas. É apenas um downloader top para você baixar trilhas para os seus vídeos <3</p>
            <p>No entanto, por ser gratuito, a cada 1h de inatividade, o site "dorme". Então já sabe, se for sua primeira vez no dia, é provável que ele demore cerca de 30 segundos no primeiro download, mas os demais já ficam estabilizados.</p>
            <button id="closePopup">Tmj!!!</button>
        </div>
    </div>

    <script src="script.js"></script>
    <script>
        let previousCount = 0;

        async function updateDownloadCount() {
            try {
                const response = await fetch('/downloads/count');
                const data = await response.json();
                const downloadCountElement = document.getElementById('downloadCount');
                const countTextElement = downloadCountElement.querySelector('.count-text');
                countTextElement.textContent = Total de downloads: ${data.count};
                
                // Adiciona animação quando o número aumenta
                if (data.count > previousCount) {
                    countTextElement.style.transform = 'scale(1.2)';
                    setTimeout(() => {
                        countTextElement.style.transform = 'scale(1)';
                    }, 300);
                }
                previousCount = data.count;
            } catch (error) {
                console.error('Erro ao obter contador de downloads:', error);
            }
        }

        // Atualizar o contador a cada 5 segundos
        setInterval(updateDownloadCount, 5000);

        // Exibir pop-up na primeira vez que o usuário acessar o site no dia
        document.addEventListener('DOMContentLoaded', function() {
            const popupOverlay = document.getElementById('popupOverlay');
            const closePopupButton = document.getElementById('closePopup');

            let lastVisit = localStorage.getItem('lastVisit');
            const today = new Date().toDateString();

            if (lastVisit !== today) {
                popupOverlay.style.display = 'flex';
                localStorage.setItem('lastVisit', today);
            }

            closePopupButton.addEventListener('click', function() {
                popupOverlay.style.display = 'none';
            });
        });
    </script>
</body>
</html>






document.querySelectorAll('.format-button').forEach(button => {
    button.addEventListener('click', function() {
        document.querySelectorAll('.format-button').forEach(btn => btn.classList.remove('selected'));
        this.classList.add('selected');
        document.getElementById('selectedFormat').value = this.getAttribute('data-format');
    });
});

document.getElementById('videoUrl').addEventListener('input', async function() {
    const url = this.value;
    const container = document.getElementById('container');
    const errorMessage = document.getElementById('errorMessage');
    const downloadButton = document.getElementById('downloadButton');

    const isValidUrl = isSupportedUrl(url);

    if (isValidUrl) {
        container.classList.remove('error'); 
        errorMessage.style.display = 'none'; 
        downloadButton.classList.remove('hidden'); 
        try {
            const videoInfo = await fetchVideoInfo(url);
            if (videoInfo) {
                document.getElementById('videoThumbnail').src = videoInfo.thumbnail;
                document.getElementById('videoTitle').textContent = videoInfo.title;
                const videoInfoElement = document.getElementById('videoInfo');
                const bodyElement = document.body;

                bodyElement.style.backgroundImage = url(${videoInfo.thumbnail});
                
                videoInfoElement.style.display = 'block'; 
                videoInfoElement.classList.add('show'); 
                document.getElementById('container').classList.add('move-up');
            }
        } catch (error) {
            console.error("Erro ao obter informações do vídeo:", error);
        }
    } else {
        container.classList.add('error'); 
        errorMessage.style.display = 'block'; 
        downloadButton.classList.add('hidden'); 
    }
});

function isSupportedUrl(url) {
    const supportedSites = [
        'youtube.com/watch', 'youtube.com/shorts', 'youtu.be'
    ];
    return supportedSites.some(site => url.includes(site));
}

function startDownload(event) {
    event.preventDefault();
    const downloadButton = document.getElementById('downloadButton');
    downloadButton.disabled = true;
    downloadButton.textContent = "Aguarde... 15";
    document.getElementById('downloadForm').submit();
    let countdown = 15;
    const interval = setInterval(() => {
        countdown -= 1;
        downloadButton.textContent = Aguarde... ${countdown};
        if (countdown <= 0) {
            clearInterval(interval);
            downloadButton.disabled = false;
            downloadButton.textContent = "Download";
        }
    }, 1000);
}

async function fetchVideoInfo(url) {
    const videoId = extractVideoId(url);
    if (!videoId) return null;
    const apiUrl = https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId};
    const response = await fetch(apiUrl);
    const data = await response.json();
    return {
        title: data.title,
        thumbnail: data.thumbnail_url
    };
}

function extractVideoId(url) {
    const videoIdMatch = url.match(/[?&]v=([^&#]*)|\/shorts\/([^\/?&]*)|youtu.be\/([^\/?&#]*)/);
    return videoIdMatch ? (videoIdMatch[1] || videoIdMatch[2] || videoIdMatch[3]) : null;
}
