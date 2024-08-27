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
        const title = 'video'; // Nome padrão do vídeo, já que não podemos usar yt-dlp-exec para obter o título
        let outputFilename = `${title}.${format}`;
        let outputPath = path.resolve(__dirname, 'downloads', outputFilename);

        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }

        // Caminho para o binário do yt-dlp que você fez upload
        const ytDlpPath = path.join(__dirname, 'src', 'yt-dlp');

        // Baixar o vídeo ou áudio com yt-dlp via binário
        const ytDlpProcess = spawn(ytDlpPath, [
            url,
            '--format',
            format === 'mp4' ? 'bestvideo+bestaudio' : 'bestaudio',
            '--merge-output-format',
            format,
            '--output',
            outputPath
        ]);

        ytDlpProcess.on('close', (code) => {
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
                console.error('Erro ao processar o download.');
                res.status(500).send('Erro ao processar o download');
            }
        });
    } catch (error) {
        console.error(`Erro ao processar o download: ${error.message}`);
        return res.status(500).send('Erro ao processar o download');
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
