let config = {}, isDone = false, userPhone = "", isActive = false;
const canvas = document.getElementById('scratchCanvas');
const ctx = canvas.getContext('2d');
const coin = document.getElementById('scratch-coin');
const sfx = document.getElementById('sfx');
const winSfx = document.getElementById('winSfx');

async function launch() {
    userPhone = document.getElementById('phone').value.trim();
    if (userPhone.length !== 10) return alert("Enter 10-digit mobile");
    document.getElementById('login-box').style.display = 'none';
    document.getElementById('scratch-container').style.display = 'block';
    
    const res = await fetch('/api/config');
    config = await res.json();
    init();
}

function init() {
    ctx.fillStyle = '#C0C0C0'; ctx.fillRect(0,0,320,320);
    ctx.font = "bold 16px Poppins"; ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.textAlign = "center";
    ctx.fillText("iPROMAX KOCHI", 160, 160);

    const start = (e) => { if(isDone) return; isActive = true; coin.style.display = 'block'; scratch(e); };
    const end = () => { isActive = false; sfx.pause(); coin.style.display = 'none'; };

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); start(e); }, {passive: false});
    window.addEventListener('touchend', end);
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); scratch(e); }, {passive: false});
}

function scratch(e) {
    if(isDone || !isActive) return;
    if(sfx.paused) { sfx.playbackRate = 1.2; sfx.play(); }

    const rect = canvas.getBoundingClientRect();
    const cx = e.touches[0].clientX; const cy = e.touches[0].clientY;
    const x = cx - rect.left; const y = cy - rect.top;

    coin.style.left = `${cx}px`; coin.style.top = `${cy}px`;
    if ("vibrate" in navigator) navigator.vibrate(5);

    ctx.globalCompositeOperation = 'destination-out';
    ctx.filter = 'blur(4px)';
    ctx.beginPath(); ctx.arc(x,y,35,0,Math.PI*2); ctx.fill();
    
    const p = ctx.getImageData(0,0,320,320).data;
    let wiped = 0; for(let i=3; i<p.length; i+=4) if(p[i]===0) wiped++;
    if(wiped > (320*320*0.25)) finalize(); // 25% Reveal
}

async function finalize() {
    isDone = true; sfx.pause();
    canvas.style.opacity = "0";

    const r = await fetch(config.sheet);
    const t = await r.text();
    const gifts = t.split('\n').slice(1).map(l => ({n: l.split(',')[0].trim(), w: parseInt(l.split(',')[1])||1}));
    let total = gifts.reduce((s, g) => s + g.w, 0);
    let rand = Math.random() * total;
    let prize = gifts[0].n;
    for(let g of gifts) { if(rand < g.w) { prize = g.n; break; } rand -= g.w; }
    const code = `IPX-${Math.floor(1000+Math.random()*9000)}`;

    await fetch('/api/save-win', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone: userPhone, prize, code }) });

    setTimeout(() => {
        document.getElementById('scratch-container').style.display = 'none';
        document.getElementById('claim-box').style.display = 'block';
        document.getElementById('wonText').innerText = prize;
        document.getElementById('idBadge').innerText = `ID: ${code}`;
        winSfx.play();
        confetti({ particleCount: 200, colors: ['#D4AF37', '#C0C0C0', '#FFFFFF'] });
    }, 500);
}

function review() {
    window.open("https://search.google.com/local/writereview?placeid=ChIJLytlO64NCDsRVhE0w4DRZTg&rate=5", "_blank");
    document.getElementById('lock-msg').innerText = "✅ REVIEW OPENED! Steps Unlocked:";
    document.getElementById('unlocked-actions').style.display = 'block';
    document.getElementById('reviewBtn').style.display = 'none';
}

function downloadPrize() {
    html2canvas(document.querySelector("#capture-area")).then(c => {
        const a = document.createElement('a'); a.download = 'iPromax-Winner.png'; a.href = c.toDataURL(); a.click();
    });
}

function claim() {
    const msg = `*iPromax Reward Claim*\nPhone: ${userPhone}\nPrize: ${document.getElementById('wonText').innerText}\nReview: DONE ✅`;
    window.location.href = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(msg)}`;
}
