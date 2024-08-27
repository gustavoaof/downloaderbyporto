const express = require('express');
const youtubedl = require('yt-dlp-exec'); 
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
        const info = await youtubedl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true
        });

        console.log('Video Info:', info);

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
            console.log(`MP4 Downloaded to: ${outputPath}`);
        } else {
            const tempPath = path.resolve(__dirname, 'downloads', 'download.m4a');
            await youtubedl(url, {
                format: 'bestaudio',
                output: tempPath
            });

            const outputFinalPath = format === 'wav' ? outputPath : outputPath.replace(/\.wav$/, '.mp3');
            const ffmpegCommand = spawn('ffmpeg', ['-i', tempPath, outputFinalPath, '-y']);

            ffmpegCommand.on('close', (code) => {
                console.log(`FFmpeg process exited with code: ${code}`);
                if (code === 0) {
                    console.log(`File converted to: ${outputFinalPath}`);
                    res.download(outputFinalPath, outputFilename, (err) => {
                        if (!err) {
                            fs.unlinkSync(outputFinalPath);
                            fs.unlinkSync(tempPath);
                            console.log('Download completed and files cleaned up.');
                        } else {
                            console.error('Error during file download:', err);
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
                console.log('Download completed and files cleaned up.');
            } else {
                console.error('Error during file download:', err);
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
