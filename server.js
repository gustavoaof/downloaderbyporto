const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
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
app.get('/download', async (req, res) => {
    const url = req.query.url;
    const format = req.query.format;

    console.log(`URL: ${url}`);
    console.log(`Format: ${format}`);

    if (!url || !format || !['mp4', 'wav', 'mp3'].includes(format)) {
        return res.status(400).send('Formato não suportado. Use mp4, wav ou mp3.');
    }

    const outputDir = path.resolve(__dirname, 'downloads');
    const outputFilename = `download.${format}`;
    const outputPath = path.join(outputDir, outputFilename);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const ytdlpPath = path.join(__dirname, 'yt-dlp.exe');
    const args = [`--output`, outputPath, url];

    if (format === 'mp3' || format === 'wav') {
        args.unshift(`-x`, `--audio-format`, format);
    } else if (format === 'mp4') {
        args.unshift(`-f`, `bestvideo+bestaudio`);
    }

    execFile(ytdlpPath, args, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erro ao processar o download: ${stderr}`);
            return res.status(500).send('Erro ao processar o download');
        }

        res.download(outputPath, outputFilename, (err) => {
            if (!err) {
                fs.unlinkSync(outputPath);
                console.log('Download completed and files cleaned up.');
            } else {
                console.error('Error during file download:', err);
            }
        });
    });
});

// Configuração para exibir erros no console
process.on('uncaughtException', function (err) {
    console.error(err.stack);
    process.exit(1);
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
