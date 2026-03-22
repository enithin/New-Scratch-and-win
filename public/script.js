let config = {}, isDone = false, userPhone = "", isActive = false, isUnlocked = false;
const canvas = document.getElementById('scratchCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const coin = document.getElementById('scratch-coin');
const sfx = document.getElementById('sfx');
const winSfx = document.getElementById('winSfx');

function unlockReview() {
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

function checkProgress(ctx) {
    const imageData = ctx.getImageData(0, 0, 320, 320);
    const pixels = imageData.data;
    let transparent = 0;

    // Check every 4th pixel (Alpha channel)
    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 150) { // If pixel is mostly erased
            transparent++;
        }
    }

    const percent = transparent / (320 * 320);
    
    // REDUCE THRESHOLD: If 20% is scratched, reveal the prize.
    // This feels much faster and "error-free" for the customer.
    if (percent > 0.20 && !isDone) {
        finalize();
    }
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
async function finalize() {
    if (isDone) return;
    isDone = true;

    // 1. Immediate Visual Feedback
    canvas.style.opacity = "0"; 
    if ("vibrate" in navigator) navigator.vibrate([100, 50, 200]);
    if (winSfx) winSfx.play().catch(() => {});

    // 2. Show the box immediately with a "Loading" message
    document.getElementById('scratch-container').style.display = 'none';
    document.getElementById('claim-box').style.display = 'block';
    document.getElementById('wonText').innerText = "Verifying..."; 

    try {
        // 3. Fetch Prize from Google
        const res = await fetch(config.sheet);
        const text = await res.json(); // Ensure your server sends JSON or text correctly
        
        // ... (Your existing prize selection logic) ...

        // 4. Update UI with the actual prize
        document.getElementById('wonText').innerText = prize;
        document.getElementById('idBadge').innerText = `ID: ${code}`;

        // 5. Success Confetti
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

    } catch (error) {
        console.error("Reveal Error:", error);
        document.getElementById('wonText').innerText = "Network Error - Try Again";
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
