let config = {}, isDone = false, userPhone = "", isActive = false, particles = [];
const canvas = document.getElementById('scratchCanvas');
const ctx = canvas.getContext('2d');
const coin = document.getElementById('scratch-coin');
const sfx = document.getElementById('sfx');
const winSfx = document.getElementById('winSfx');

async function launch() {
    userPhone = document.getElementById('phone').value.trim();
    if (userPhone.length !== 10 || isNaN(userPhone)) return alert("Enter valid 10-digit number");
    if (!document.getElementById('tcCheck').checked) return alert("Please accept Terms");

    // Audio Unlock
    sfx.play().then(() => { sfx.pause(); sfx.currentTime = 0; }).catch(() => {});

    document.getElementById('login-box').style.display = 'none';
    document.getElementById('scratch-container').style.display = 'block';
    
    try {
        const res = await fetch('/api/config');
        config = await res.json();
        init();
    } catch(e) { alert("Server Error. Please refresh."); }
}

function init() {
    // Fill with Silver Foil
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(0,0,320,320);
    
    // Add Branding to Foil
    ctx.font = "bold 16px Poppins"; ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.textAlign = "center";
    ctx.fillText("iPROMAX KOCHI", 160, 145);
    ctx.font = "bold 18px Poppins"; ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("SCRATCH WITH COIN", 160, 175);

    const start = (e) => { if(isDone) return; isActive = true; coin.style.display = 'block'; scratch(e); };
    const end = () => { isActive = false; sfx.pause(); coin.style.display = 'none'; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); start(e); }, {passive: false});
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
    canvas.addEventListener('mousemove', scratch);
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); scratch(e); }, {passive: false});
}

function scratch(e) {
    if(isDone || !isActive) return;
    if(sfx.paused) { sfx.playbackRate = 1.2; sfx.play(); }

    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const x = cx - rect.left; const y = cy - rect.top;

    // Move Coin & Haptics
    coin.style.left = `${cx}px`; coin.style.top = `${cy}px`;
    if ("vibrate" in navigator) navigator.vibrate(5);

    // Scratch Logic
    ctx.globalCompositeOperation = 'destination-out';
    ctx.filter = 'blur(2px)';
    ctx.beginPath(); ctx.arc(x,y,28,0,Math.PI*2); ctx.fill();
    
    checkProgress();
}

function checkProgress() {
    const p = ctx.getImageData(0,0,320,320).data;
    let wiped = 0; for(let i=3; i<p.length; i+=4) if(p[i]===0) wiped++;
    if(wiped > (320*320*0.7) && !isDone) finalize();
}

async function finalize() {
    isDone = true; sfx.pause();
    canvas.style.display = 'none';

    try {
        const r = await fetch(config.sheet);
        const t = await r.text();
        const gifts = t.split('\n').slice(1).map(l => ({n: l.split(',')[0].trim(), w: parseInt(l.split(',')[1])||1}));
        let total = gifts.reduce((s, g) => s + g.w, 0);
        let rand = Math.random() * total;
        let prize = gifts[0].n;
        for(let g of gifts) { if(rand < g.w) { prize = g.n; break; } rand -= g.w; }
        const code = `IPX-${Math.floor(1000+Math.random()*9000)}`;

        await fetch('/api/save-win', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: userPhone, prize, code })
        });

        document.getElementById('scratch-container').style.display = 'none';
        document.getElementById('claim-box').style.display = 'block';
        document.getElementById('wonText').innerText = prize;
        document.getElementById('idBadge').innerText = `REDEEM CODE: ${code}`;

        setTimeout(() => {
            winSfx.play().catch(() => {});
            confetti({ particleCount: 200, spread: 90, origin: { y: 0.7 }, colors: ['#D4AF37', '#C0C0C0', '#FFFFFF'] });
        }, 300);
    } catch(e) { alert("Network Error. Show this screen to staff!"); }
}

function review() {
    window.open("https://search.google.com/local/writereview?placeid=ChIJLytlO64NCDsRVhE0w4DRZTg&rate=5", "_blank");
    document.getElementById('lock-msg').innerHTML = "✅ REVIEW OPENED! Steps Unlocked:";
    document.getElementById('unlocked-actions').style.display = 'block';
    document.getElementById('reviewBtn').style.display = 'none';
}

async function downloadPrize() {
    const btn = event.currentTarget;
    btn.innerText = "GENERATING...";
    html2canvas(document.querySelector("#capture-area"), { scale: 3, backgroundColor: "#0f0f0f" }).then(canvas => {
        const link = document.createElement('a');
        link.download = `iPromax-Kochi-Winner.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        btn.innerText = "💾 SAVE TO PHOTOS";
    });
}

function claim() {
    const msg = `*iPromax Reward Claim*\nPhone: ${userPhone}\nPrize: ${document.getElementById('wonText').innerText}\nReview: DONE ✅`;
    window.location.href = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(msg)}`;
}

function toggleModal(s) { document.getElementById('tcModal').style.display = s ? 'flex' : 'none'; }
