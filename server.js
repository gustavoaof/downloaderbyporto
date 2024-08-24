const express = require('express');
const youtubedl = require('youtube-dl-exec');
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

    console.log(`Tentando baixar URL: ${url} no formato: ${format}`);

    if (!url || !format || !['mp4', 'wav', 'mp3'].includes(format)) {
        console.error('Formato não suportado ou URL inválida');
        return res.status(400).send('Formato não suportado. Use mp4, wav ou mp3.');
    }

    try {
        // Usando youtube-dl-exec para obter informações sobre o vídeo
        const info = await youtubedl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true
        });

        const title = info.title.replace(/[^a-zA-Z0-9 ]/g, '');
        let outputFilename = `${title}.${format}`;
        let outputPath = path.resolve(__dirname, 'downloads', outputFilename);

        console.log(`Caminho para o arquivo gerado: ${outputPath}`);

        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }

        // Baixar o vídeo ou áudio com o youtube-dl-exec
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
                        console.log('Arquivo enviado com sucesso');
                        fs.unlinkSync(outputPath);
                        fs.unlinkSync(tempPath);
                        // Incrementar o contador de downloads
                        downloadCount++;
                        fs.writeFileSync(downloadCountFile, downloadCount.toString());
                    } else {
                        console.error('Erro ao enviar o arquivo:', err);
                        return res.status(404).send('Arquivo não encontrado');
                    }
                });
            });
            return;
        }

        res.download(outputPath, outputFilename, (err) => {
            if (!err) {
                console.log('Arquivo enviado com sucesso');
                fs.unlinkSync(outputPath);
                // Incrementar o contador de downloads
                downloadCount++;
                fs.writeFileSync(downloadCountFile, downloadCount.toString());
            } else {
                console.error('Erro ao enviar o arquivo:', err);
                return res.status(404).send('Arquivo não encontrado');
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
