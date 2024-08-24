const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3001;

// Caminho para o arquivo que armazena o contador de downloads
const downloadCountFile = path.join(__dirname, 'downloadCount.txt');

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

    console.log(`URL: ${url}`);
    console.log(`Format: ${format}`);

    if (!url || !format || !['mp4', 'wav', 'mp3'].includes(format)) {
        return res.status(400).send('Formato não suportado. Use mp4, wav ou mp3.');
    }

    const outputFilename = `output.${format}`;
    const outputPath = path.resolve(__dirname, 'downloads', outputFilename);

    exec(`yt-dlp -f "bestaudio[ext=${format}]" -o "${outputPath}" "${url}"`, (error) => {
        if (error) {
            console.error(`Erro ao processar o download: ${error.message}`);
            return res.status(500).send('Erro ao processar o download');
        }

        res.download(outputPath, outputFilename, (err) => {
            if (!err) {
                fs.unlinkSync(outputPath);
                // Incrementar o contador de downloads
                downloadCount++;
                fs.writeFileSync(downloadCountFile, downloadCount.toString());
            }
        });
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
