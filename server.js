const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3001;

// Middleware para servir arquivos estáticos da pasta raiz
app.use(express.static(path.join(__dirname)));

// Rota para servir o arquivo 'index.html'
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para download de vídeos/áudios
app.get('/download', (req, res) => {
    const url = req.query.url;
    const format = req.query.format;

    if (!url || !format || !['mp4', 'wav', 'mp3'].includes(format)) {
        return res.status(400).send('Formato não suportado. Use mp4, wav ou mp3.');
    }

    const outputFilename = `output.${format}`;
    const outputPath = path.resolve(__dirname, outputFilename);

    // Verificar se o arquivo de saída já existe, e deletá-lo se existir
    if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
    }

    const ytDlp = spawn(path.join(__dirname, 'yt-dlp.exe'), [url, '-f', format, '-o', outputPath]);

    ytDlp.on('close', (code) => {
        if (code === 0) {
            res.download(outputPath, outputFilename, (err) => {
                if (!err) {
                    fs.unlinkSync(outputPath);  // Limpar o arquivo baixado após o envio
                } else {
                    console.error('Erro durante o download do arquivo:', err);
                }
            });
        } else {
            res.status(500).send('Erro ao processar o download');
        }
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
