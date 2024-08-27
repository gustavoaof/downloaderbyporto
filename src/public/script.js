document.querySelectorAll('.format-button').forEach(button => {
    button.addEventListener('click', function() {
        document.querySelectorAll('.format-button').forEach(btn => btn.classList.remove('selected'));
        this.classList.add('selected');
        document.getElementById('selectedFormat').value = this.getAttribute('data-format');
    });
});

document.getElementById('videoUrl').addEventListener('input', async function() {
    const url = this.value;
    const container = document.getElementById('container');
    const errorMessage = document.getElementById('errorMessage');
    const downloadButton = document.getElementById('downloadButton');

    const isValidUrl = isSupportedUrl(url);

    if (isValidUrl) {
        container.classList.remove('error'); 
        errorMessage.style.display = 'none'; 
        downloadButton.classList.remove('hidden'); 
        try {
            const videoInfo = await fetchVideoInfo(url);
            if (videoInfo) {
                document.getElementById('videoThumbnail').src = videoInfo.thumbnail;
                document.getElementById('videoTitle').textContent = videoInfo.title;

                const videoInfoElement = document.getElementById('videoInfo');
                const bodyElement = document.body;

                bodyElement.style.backgroundImage = `url(${videoInfo.thumbnail})`;
                
                videoInfoElement.style.display = 'block'; 
                videoInfoElement.classList.add('show'); 
                container.classList.add('move-up');
            }
        } catch (error) {
            console.error("Erro ao obter informações do vídeo:", error);
        }
    } else {
        container.classList.add('error'); 
        errorMessage.style.display = 'block'; 
        downloadButton.classList.add('hidden'); 
    }
});

function isSupportedUrl(url) {
    const supportedSites = [
        'youtube.com/watch', 
        'youtube.com/shorts', 
        'youtu.be'
    ];
    return supportedSites.some(site => url.includes(site));
}

function startDownload(event) {
    event.preventDefault();
    const downloadButton = document.getElementById('downloadButton');
    downloadButton.disabled = true;
    downloadButton.textContent = "Aguarde... 15";
    document.getElementById('downloadForm').submit();
    
    let countdown = 15;
    const interval = setInterval(() => {
        countdown -= 1;
        downloadButton.textContent = `Aguarde... ${countdown}`;
        if (countdown <= 0) {
            clearInterval(interval);
            downloadButton.disabled = false;
            downloadButton.textContent = "Download";
        }
    }, 1000);
}

async function fetchVideoInfo(url) {
    const videoId = extractVideoId(url);
    if (!videoId) return null;

    const apiUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
        throw new Error('Erro ao acessar a API');
    }

    const data = await response.json();
    return {
        title: data.title,
        thumbnail: data.thumbnail_url
    };
}

function extractVideoId(url) {
    const videoIdMatch = url.match(/[?&]v=([^&#]*)|\/shorts\/([^\/?&]*)|youtu.be\/([^\/?&#]*)/);
    return videoIdMatch ? (videoIdMatch[1] || videoIdMatch[2] || videoIdMatch[3]) : null;
}
