const supabaseUrl = 'https://cvpssknuznwkdlemfyqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cHNza251em53a2RsZW1meXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwODk5MzUsImV4cCI6MjA2NzY2NTkzNX0.PYkxLXaPNTsOggcvWwMR2j4k3EojA9bZtscPNiutP-Q';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const soundboard = document.getElementById('soundboard');
const soundUpload = document.getElementById('sound-upload');
const uploadButton = document.getElementById('upload-button');
const syncToggle = document.getElementById('sync-toggle');
const playerIcons = document.querySelectorAll('.player-icon');

const channel = supabase.channel('soundboard-channel');
let selectedIconClass = 'player-1'; // Default icon class

function playSound(fileName, iconClass) {
    const buttons = document.querySelectorAll('.sound-button');
    const button = Array.from(buttons).find(btn => btn.dataset.fileName === fileName);

    if (button) {
        const playerDisplay = button.querySelector('.player-display');
        const audio = new Audio(supabase.storage.from('sounds').getPublicUrl(fileName).data.publicUrl);
        
        playerDisplay.className = `player-display ${iconClass}`;
        button.classList.add('playing');
        audio.play();

        audio.addEventListener('ended', () => {
            button.classList.remove('playing');
            playerDisplay.className = 'player-display'; // Reset class
        });
    }
}

async function fetchSounds() {
    const { data, error } = await supabase
        .storage
        .from('sounds')
        .list();

    if (error) {
        console.error('Error fetching sounds:', error);
        return;
    }

    soundboard.innerHTML = '';
    for (const file of data) {
        const button = document.createElement('button');
        button.textContent = file.name.replace('.mp3', '');
        button.classList.add('sound-button');
        button.dataset.fileName = file.name; // Store filename

        const playerDisplay = document.createElement('span');
        playerDisplay.classList.add('player-display');
        button.appendChild(playerDisplay);

        button.addEventListener('click', () => {
            playSound(file.name, selectedIconClass);

            if (syncToggle.checked) {
                channel.send({
                    type: 'broadcast',
                    event: 'play-sound',
                    payload: { name: file.name, iconClass: selectedIconClass }
                });
            }
        });
        soundboard.appendChild(button);
    }
}

uploadButton.addEventListener('click', async () => {
    const file = soundUpload.files[0];
    if (!file) {
        alert('Please select a file to upload.');
        return;
    }

    const fileName = `${file.name}`;
    const { error } = await supabase
        .storage
        .from('sounds')
        .upload(fileName, file);

    if (error) {
        console.error('Error uploading sound:', error);
        alert('Error uploading sound.');
    } else {
        channel.send({ type: 'broadcast', event: 'new-upload' });
    }
});

// Handle player icon selection
playerIcons.forEach((icon, index) => {
    icon.addEventListener('click', () => {
        playerIcons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
        selectedIconClass = `player-${index + 1}`;
    });
});

// Handle sync toggle
syncToggle.addEventListener('change', () => {
    if (syncToggle.checked) {
        channel
            .on('broadcast', { event: 'play-sound' }, (payload) => {
                playSound(payload.payload.name, payload.payload.iconClass);
            })
            .on('broadcast', { event: 'new-upload' }, () => {
                fetchSounds();
            })
            .subscribe();
    } else {
        channel.unsubscribe();
    }
});

// Initial fetch
fetchSounds();

