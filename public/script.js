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

async function launch() {
    userPhone = document.getElementById('phone').value.trim();
    if (userPhone.length !== 10) return alert("Enter 10-digit mobile");
    if (!document.getElementById('tcCheck').checked) return alert("Accept T&C first");
    
    const res = await fetch('/api/config');
    config = await res.json();
    document.getElementById('login-box').style.display = 'none';
    document.getElementById('scratch-container').style.display = 'block';
    init();
}

function init() {
    ctx.fillStyle = '#C0C0C0'; ctx.fillRect(0,0,320,320);
    ctx.font = "bold 15px Poppins"; ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.textAlign = "center";
    ctx.fillText("Scratch Here", 160, 160);

    const start = (e) => { if(isDone) return; isActive = true; coin.style.display='block'; scratch(e); };
    const end = () => { isActive = false; sfx.pause(); coin.style.display='none'; };
    canvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); start(e); }, {passive:false});
    canvas.addEventListener('touchmove', (e)=>{ e.preventDefault(); scratch(e); }, {passive:false});
    window.addEventListener('touchend', end);
}

function scratch(e) {
    if (isDone || !isActive) return;

    const rect = canvas.getBoundingClientRect();
    
    // Logic to pick the right coordinates based on device
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Move the coin graphic to the pointer/finger
    coin.style.left = `${clientX}px`;
    coin.style.top = `${clientY}px`;

    // The Erasing Logic
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 35, 0, Math.PI * 2);
    ctx.fill();
    
    // Performance: Only check win progress every 10th movement
    scratchTicks++;
    if (scratchTicks % 10 === 0) checkProgress();
}
async function finalize() {
    if(isDone) return; isDone = true;
    sfx.pause(); canvas.style.opacity = "0";
    if ("vibrate" in navigator) navigator.vibrate([100, 50, 200]);

    const t = await (await fetch(config.sheet)).text();
    const gifts = t.split('\n').slice(1).map(l => ({n: l.split(',')[0].trim(), w: parseInt(l.split(',')[1])||1}));
    let total = 0; gifts.forEach(g => total += g.w);
    let rand = Math.random() * total, prize = gifts[0].n;
    for(let g of gifts) { if(rand < g.w) { prize = g.n; break; } rand -= g.w; }
    
    const code = `IPX-${Math.floor(1000+Math.random()*9000)}`;
    await fetch('/api/save-win', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ phone: userPhone, prize, code }) });

    setTimeout(() => {
        document.getElementById('scratch-container').style.display='none';
        document.getElementById('claim-box').style.display='block';
        document.getElementById('wonText').innerText = prize;
        document.getElementById('idBadge').innerText = `ID: ${code}`;
        winSfx.play();
        confetti({ particleCount: 150, colors: ['#D4AF37', '#C0C0C0', '#FFF'] });
    }, 500);
}

function downloadPrize() {
    html2canvas(document.querySelector("#capture-area")).then(c => {
        const a = document.createElement('a'); a.download = 'iPromax-Winner.png'; a.href = c.toDataURL(); a.click();
    });
}

function claim() {
    window.location.href = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Claiming prize: " + document.getElementById('wonText').innerText + " for mobile " + userPhone)}`;
}
