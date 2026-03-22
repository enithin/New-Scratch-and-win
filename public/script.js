let config = {};
let isDone = false;
let isActive = false;
let isUnlocked = false;
let userPhone = "";
let scratchTicks = 0; // The missing piece!
let config = {
    sheet: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-l3u_RPGWbhRy4UdOH1U7SJsfWTTTbocfFN_P0alnrtTUaN9L6RufbN9RAyrs7m1fM81xw3Y6mf3M/pub?output=csv",
    whatsapp: "917306738779"
};
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

    // Immediate UI Feedback
    canvas.style.opacity = "0"; 
    document.getElementById('scratch-container').style.display = 'none';
    document.getElementById('claim-box').style.display = 'block';
    document.getElementById('wonText').innerText = "Verifying..."; 

    try {
        const res = await fetch(config.sheet);
        const csvText = await res.text();
        
        // Split by lines and remove any empty lines or CSS/HTML leftovers
        const lines = csvText.split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.includes('{') && !line.startsWith('<'));

        // Skip the header row (Prize Name, Weight)
        const prizeRows = lines.slice(1);
        
        const gifts = prizeRows.map(l => {
            const parts = l.split(',');
            return { 
                name: parts[0] ? parts[0].replace(/"/g, '').trim() : "Special Gift", 
                weight: parseInt(parts[1]) || 1 
            };
        });

        // Weighted Random Selection
        let total = 0; 
        gifts.forEach(g => total += g.weight);
        let rand = Math.random() * total;
        let selectedPrize = gifts[0].name;

        for (let g of gifts) {
            if (rand < g.weight) {
                selectedPrize = g.name;
                break;
            }
            rand -= g.weight;
        }

        // Final Reveal
        const winID = `IPX-${Math.floor(1000 + Math.random() * 9000)}`;
        document.getElementById('wonText').innerText = selectedPrize;
        document.getElementById('idBadge').innerText = `ID: ${winID}`;
        
        // Celebration
        if (winSfx) winSfx.play();
        confetti({ particleCount: 150, spread: 70, colors: ['#D4AF37', '#FFFFFF'] });

    } catch (err) {
        console.error("Reveal Error:", err);
        document.getElementById('wonText').innerText = "Fetch Error - Ask Staff";
    }
}
function downloadPrize() {
    html2canvas(document.querySelector("#capture-area")).then(c => {
        const a = document.createElement('a'); a.download = 'iPromax-Winner.png'; a.href = c.toDataURL(); a.click();
    });
}
function claim() {
    window.location.href = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Claiming prize: " + document.getElementById('wonText').innerText + " for mobile " + userPhone)}`;
}
