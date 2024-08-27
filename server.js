const express = require('express');
const ytdl = require('ytdl-core');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Middleware para servir arquivos estáticos da pasta 'src/public'
app.use(express.static(path.join(__dirname, 'src/public')));

// Rota para servir o arquivo 'index.html'
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/public', 'index.html'));
});

// Rota para download de vídeos/áudios
app.get('/download', (req, res) => {
    const url = req.query.url;
    const format = req.query.format;

    console.log(`URL: ${url}`);
    console.log(`Format: ${format}`);

    if (!url || !['mp4', 'mp3'].includes(format)) {
        return res.status(400).send('Formato não suportado. Use mp4 ou mp3.');
    }

    let outputFilename = `download.${format}`;
    res.header('Content-Disposition', `attachment; filename="${outputFilename}"`);

    if (format === 'mp4') {
        ytdl(url, { format: 'mp4' }).pipe(res);
    } else if (format === 'mp3') {
        ytdl(url, { filter: 'audioonly' }).pipe(res);
    }
});

// Configuração para exibir erros no console
process.on('uncaughtException', function (err) {
    console.error(err.stack);
    process.exit(1);
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
