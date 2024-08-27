const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');  
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

    try {
        // Usando yt-dlp diretamente do binário
        const outputFilename = `download.${format}`;
        const outputPath = path.resolve(__dirname, 'downloads', outputFilename);

        const ytdlp = spawn(path.resolve(__dirname, 'yt-dlp.exe'), [
            url,
            '-f', format === 'mp4' ? 'bestvideo+bestaudio' : 'bestaudio',
            '-o', outputPath,
            '--merge-output-format', format === 'mp4' ? 'mp4' : undefined
        ]);

        ytdlp.on('close', (code) => {
            if (code === 0) {
                res.download(outputPath, outputFilename, (err) => {
                    if (!err) {
                        fs.unlinkSync(outputPath);
                        console.log('Download completed and files cleaned up.');
                    } else {
                        console.error('Error during file download:', err);
                    }
                });
            } else {
                console.error('yt-dlp process failed with code:', code);
                res.status(500).send('Erro ao processar o download');
            }
        });

    } catch (error) {
        console.error(`Erro ao processar o download: ${error.message}`);
        return res.status(500).send('Erro ao processar o download');
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
