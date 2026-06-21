// DJ Jesse Jay Website Scripts
// Since 1997 the progressive music attack from Zürich

// Music player controls
function playTrack(trackId) {
    const audio = document.getElementById(trackId);
    if (audio) {
        audio.play();
    }
}

function pauseTrack(trackId) {
    const audio = document.getElementById(trackId);
    if (audio) {
        audio.pause();
    }
}
