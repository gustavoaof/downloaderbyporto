const express = require('express');
const { exec, spawn } = require('child_process');
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
app.use(express.static(path.join(__dirname, 'src/public')));  // Corrigido o caminho aqui

app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'src/public', 'index.html');  // Corrigido o caminho aqui
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

    exec(`"${path.resolve(__dirname, 'yt-dlp.exe')}" --get-title "${url}"`, (error, stdout) => {
        if (error) {
            console.error(`Erro ao extrair o título: ${error.message}`);
            return res.status(500).send('Erro ao extrair o título do vídeo');
        }

        const title = stdout.trim().replace(/[^a-zA-Z0-9 ]/g, '');
        let outputFilename = `${title}.${format}`;
        let outputPath = path.resolve(__dirname, 'downloads', outputFilename);

        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }

        let ytDlpCommand;

        if (format === 'mp4') {
            ytDlpCommand = spawn(`${path.resolve(__dirname, 'yt-dlp.exe')}`, ['-f', 'bestvideo+bestaudio[ext=mp4]', '--merge-output-format', 'mp4', '--output', outputPath, url]);
        } else {
            const m4aPath = path.resolve(__dirname, 'downloads', 'download.m4a');
            if (fs.existsSync(m4aPath)) {
                fs.unlinkSync(m4aPath);
            }
            ytDlpCommand = spawn(`${path.resolve(__dirname, 'yt-dlp.exe')}`, ['-f', 'bestaudio', '--output', m4aPath, url]);
            ytDlpCommand.on('close', () => {
                const ffmpegCommand = spawn('ffmpeg', ['-i', m4aPath, format === 'wav' ? outputPath : outputPath.replace(/\.wav$/, '.mp3'), '-y']);
                ffmpegCommand.on('close', () => {
                    res.download(outputPath, outputFilename, (err) => {
                        if (!err) {
                            fs.unlinkSync(outputPath);
                            fs.unlinkSync(m4aPath);
                            // Incrementar o contador de downloads
                            downloadCount++;
                            fs.writeFileSync(downloadCountFile, downloadCount.toString());
                        }
                    });
                });
            });
            return;
        }

        ytDlpCommand.on('close', () => {
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
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
