const express = require('express');
const youtubedl = require('yt-dlp-exec'); 
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');  // Correção: necessário importar spawn
const app = express();
const port = 3001;

// Caminho para o arquivo que armazena o contador de downloads
const downloadCountFile = path.join(__dirname, 'downloads/count/texte.txt');

// Inicializar o contador de downloads
let downloadCount = 0;

// Verificar se o arquivo do contador existe, se não, criar um
if (fs.existsSync(downloadCountFile)) {
    downloadCount = parseInt(fs.readFileSync(downloadCountFile, 'utf8')) || 0;
} else {
    fs.mkdirSync(path.dirname(downloadCountFile), { recursive: true });
    fs.writeFileSync(downloadCountFile, '0');
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

    try {
        // Usando yt-dlp-exec para obter informações sobre o vídeo
        const info = await youtubedl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true
        });

        const title = info.title.replace(/[^a-zA-Z0-9 ]/g, '');
        let outputFilename = `${title}.${format}`;
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

            const outputFinalPath = format === 'wav' ? outputPath : outputPath.replace(/\.wav$/, '.mp3');
            const ffmpegCommand = spawn('ffmpeg', ['-i', tempPath, outputFinalPath, '-y']);
            ffmpegCommand.on('close', (code) => {
                if (code === 0) {  // Verificar se o processo terminou com sucesso
                    res.download(outputFinalPath, outputFilename, (err) => {
                        if (!err) {
                            fs.unlinkSync(outputFinalPath);
                            fs.unlinkSync(tempPath);
                            // Incrementar o contador de downloads
                            downloadCount++;
                            fs.writeFileSync(downloadCountFile, downloadCount.toString());
                        }
                    });
                } else {
                    console.error('Erro no processamento do ffmpeg.');
                    res.status(500).send('Erro no processamento do arquivo.');
                }
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
        console.error(`Erro ao processar o download: ${error.message}`);
        return res.status(500).send('Erro ao processar o download');
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
