let config = {};
let isDone = false;
let isActive = false;
let isUnlocked = false;
let userPhone = "";
let scratchTicks = 0; // The missing piece!
const canvas = document.getElementById('scratchCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const coin = document.getElementById('scratch-coin');
const sfx = document.getElementById('sfx');
const winSfx = document.getElementById('winSfx');

function unlockScratch() {
    window.open("https://search.google.com/local/writereview?placeid=ChIJLytlO64NCDsRVhE0w4DRZTg&rate=5", "_blank");
    document.getElementById('gate-1').style.display = 'none';
    document.getElementById('gate-2').style.display = 'block';
    isUnlocked = true;
}

// Function to Open/Close Modal
function toggleModal(show) {
    const modal = document.getElementById('tcModal');
    if (show) {
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
}

// Function to handle the Review Gate
function unlockScratch() {
    window.open("https://search.google.com/local/writereview?placeid=ChIJLytlO64NCDsRVhE0w4DRZTg&rate=5", "_blank");
    
    // Switch to Agree & Start button
    document.getElementById('review-gate').style.display = 'none';
    document.getElementById('scratch-gate').style.display = 'block';
    
    isUnlocked = true;
    if ("vibrate" in navigator) navigator.vibrate(50);
}
async function launch() {
    userPhone = document.getElementById('phone').value.trim();
    
    // 1. Check if phone is valid
    if (userPhone.length !== 10) {
        return alert("Please enter a valid 10-digit mobile number.");
    }

    // 2. Check if the user unlocked the review gate first
    if (!isUnlocked) {
        return alert("Please complete Step 1 (Google Review) first!");
    }

    // Since they clicked the "AGREE & START" button, 
    // we already know they agreed. No need to check a box!
    
    document.getElementById('login-box').style.display = 'none';
    document.getElementById('scratch-container').style.display = 'block';
    
    // Start the scratch engine
    init();
}

function init() {
    const canvas = document.getElementById('scratchCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const coin = document.getElementById('scratch-coin');

    // Draw the silver foil
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(0, 0, 320, 320);

    const start = (e) => {
        if (isDone) return;
        isActive = true;
        coin.style.display = 'block';
        scratch(e);
    };

    const end = () => {
        isActive = false;
        coin.style.display = 'none';
        if (sfx) sfx.pause();
    };

    // --- LAPTOP (MOUSE) LISTENERS ---
    canvas.addEventListener('mousedown', start);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('mousemove', (e) => {
        if (isActive) scratch(e);
    });

    // --- MOBILE (TOUCH) LISTENERS ---
    // e.preventDefault() is critical here to stop the page from scrolling while scratching
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); start(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); scratch(e); }, { passive: false });
    window.addEventListener('touchend', end);
}
function scratch(e) {
    if (isDone || !isActive) return;

    const rect = canvas.getBoundingClientRect();
    
    // Pick coordinates from Touch or Mouse
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    // Calculate position relative to the silver box
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Move the visual coin cursor
    coin.style.left = `${clientX}px`;
    coin.style.top = `${clientY}px`;

    // Play scratch sound
    if (sfx && sfx.paused) sfx.play().catch(() => {});

    // THE ERASE ACTION
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 35, 0, Math.PI * 2);
    ctx.fill();
    
    // Check if user is finished every few movements
    scratchTicks++;
    if (scratchTicks % 10 === 0) checkProgress(ctx);
}
function checkProgress(ctx) {
    // 1. Get the raw pixel data from the 320x320 canvas
    const imageData = ctx.getImageData(0, 0, 320, 320);
    const pixels = imageData.data;
    let transparentCount = 0;

    // 2. We check the 'Alpha' channel (every 4th value)
    for (let i = 3; i < pixels.length; i += 4) {
        // If the pixel is mostly erased (Alpha < 150), count it
        if (pixels[i] < 150) {
            transparentCount++;
        }
    }

    // 3. Calculate the percentage
    const percentScratched = transparentCount / (320 * 320);

    // 4. TRIGGER: If more than 20% is cleared, reveal the prize
    if (percentScratched > 0.20 && !isDone) {
        finalize();
    }
}

async function finalize() {
    if (isDone) return;
    isDone = true;

    // A. Immediate Sensory Feedback
    if ("vibrate" in navigator) navigator.vibrate([100, 50, 200]);
    canvas.style.opacity = "0"; // Smooth fade out the silver
    if (sfx) sfx.pause();
    if (winSfx) winSfx.play().catch(() => {});

    // B. Show the Card Immediately (Prevents "Blank Screen" feel)
    document.getElementById('scratch-container').style.display = 'none';
    document.getElementById('claim-box').style.display = 'block';
    document.getElementById('wonText').innerText = "Verifying Reward..."; // Placeholder

    try {
    // 1. Fetch the data
    const res = await fetch(config.sheet);
    const rawData = await res.text();
    
    // 2. SAFETY FILTER: Skip any lines that look like CSS or HTML
    const lines = rawData.split('\n')
        .map(line => line.trim())
        .filter(line => {
            return line.length > 0 && 
                   !line.includes('{') && 
                   !line.includes(':root') && 
                   !line.startsWith('<');
        });

    // 3. Ensure we have data
    if (lines.length < 2) throw new Error("No prizes found in CSV");

    // 4. Parse Prizes (Skip the header row)
    const prizeRows = lines.slice(1);
    const gifts = prizeRows.map(l => {
        const parts = l.split(',');
        return { 
            name: parts[0] ? parts[0].trim() : "Surprise Gift", 
            weight: parseInt(parts[1]) || 1 
        };
    });

    // 5. Weighted Selection
    let total = 0; gifts.forEach(g => total += g.weight);
    let rand = Math.random() * total;
    let selected = gifts[0].name;

    for (let g of gifts) {
        if (rand < g.weight) { selected = g.name; break; }
        rand -= g.weight;
    }

    // 6. Final UI Update
    const winID = `IPX-${Math.floor(1000 + Math.random() * 9999)}`;
    document.getElementById('wonText').innerText = selected;
    document.getElementById('idBadge').innerText = `ID: ${winID}`;
    
    // Celebrations
    if (winSfx) winSfx.play();
    confetti({ particleCount: 150, spread: 70, colors: ['#D4AF37', '#FFF'] });

} catch (err) {
    console.error("Fetch Failed:", err);
    document.getElementById('wonText').innerText = "Network Error - Refresh Page";
}
function downloadPrize() {
    html2canvas(document.querySelector("#capture-area")).then(c => {
        const a = document.createElement('a'); a.download = 'iPromax-Winner.png'; a.href = c.toDataURL(); a.click();
    });
}

function claim() {
    window.location.href = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Claiming prize: " + document.getElementById('wonText').innerText + " for mobile " + userPhone)}`;
}
