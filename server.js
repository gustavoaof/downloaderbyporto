const express = require('express');
const { exec } = require('child_process'); 
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Middleware para servir arquivos estáticos da pasta 'src/public'
app.use(express.static(path.join(__dirname, 'src/public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/public', 'index.html'));
});

// Função de fallback que você pode substituir com um serviço de download de vídeo online
function fallbackDownload(url, format, res) {
    res.status(500).send('Função de download indisponível no momento.');
}

// Rota para download de vídeos/áudios
app.get('/download', (req, res) => {
    const url = req.query.url;
    const format = req.query.format;

    if (!url || !format || !['mp4', 'wav', 'mp3'].includes(format)) {
        return res.status(400).send('Formato não suportado. Use mp4, wav ou mp3.');
    }

    // Utilize esta função como fallback até que encontre uma alternativa para yt-dlp-exec
    fallbackDownload(url, format, res);
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
