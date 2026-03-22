async function handleWin(prizeName) {
    // 1. Send to Node.js Backend
    const response = await fetch('/api/win', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: "Guest User",
            email: "user@example.com",
            prize: prizeName
        })
    });

    if (response.ok) {
        alert(`Congrats! You won ${prizeName}. Redirecting...`);
        // 2. Redirect back to previous page
        window.location.href = "https://your-main-site.com";
    }
}

// Logic to pick prize based on weight
function pickPrize(prizes) {
    const totalWeight = prizes.reduce((acc, p) => acc + parseInt(p.weight), 0);
    let random = Math.random() * totalWeight;
    for (const prize of prizes) {
        if (random < prize.weight) return prize.name;
        random -= prize.weight;
    }
}
