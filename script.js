const SYMBOLS = [
    { emoji: '7️⃣', weight: 8, color: '#ffd700', name: 'seven' },
    { emoji: '🍒', weight: 25, color: '#e84a3a', name: 'cherry' },
    { emoji: '🍋', weight: 20, color: '#ffdd00', name: 'lemon' },
    { emoji: '🍊', weight: 18, color: '#ff8800', name: 'orange' },
    { emoji: '🍇', weight: 12, color: '#8844ff', name: 'grapes' },
    { emoji: '🔔', weight: 10, color: '#ffd700', name: 'bell' },
    { emoji: '⭐', weight: 5, color: '#ff00ff', name: 'star' },
    { emoji: '💎', weight: 2, color: '#00ffff', name: 'diamond' }
];

// Математика барабана
const REEL_HEIGHT = 60;
const SYMBOLS_PER_REEL = 22;
const VIEWPORT_HEIGHT = 180;
const CENTER_OFFSET = 60;
const STRIP_HEIGHT = SYMBOLS_PER_REEL * REEL_HEIGHT; // 1320px

let isSpinning = false;
let stopRequested = [false, false, false];

const reelElements = [
    document.getElementById('reel1'),
    document.getElementById('reel2'),
    document.getElementById('reel3')
];

const resultPointer = document.getElementById('resultPointer');
const machine = document.getElementById('machine');
const mobileSpinBtn = document.getElementById('mobileSpinBtn');

function getRandomSymbol() {
    const totalWeight = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    for (const symbol of SYMBOLS) {
        random -= symbol.weight;
        if (random <= 0) return symbol;
    }
    return SYMBOLS[0];
}

function createReelStrip() {
    const cycles = 4;
    const symbols = Array.from({ length: SYMBOLS_PER_REEL * cycles }, getRandomSymbol);
    return symbols.map(s => 
        `<div class="reel-symbol" style="color: ${s.color}" data-name="${s.name}">${s.emoji}</div>`
    ).join('');
}

function initReels() {
    reelElements.forEach((reel, index) => {
        reel.innerHTML = `<div class="reel-inner">${createReelStrip()}</div>`;
        const inner = reel.querySelector('.reel-inner');
        inner.style.transform = `translateY(-3240px)`;
        inner.dataset.basePos = '-3240';
        
        reel.addEventListener('click', (e) => {
            if (isSpinning && !stopRequested[index]) {
                e.stopPropagation();
                requestStop(index);
            }
        });
        reel.addEventListener('touchstart', (e) => {
            if (isSpinning && !stopRequested[index]) {
                e.stopPropagation();
                requestStop(index);
            }
        }, { passive: false });
    });
}

function requestStop(reelIndex) {
    stopRequested[reelIndex] = true;
    const frame = reelElements[reelIndex].closest('.reel-frame');
    if (frame) {
        frame.style.boxShadow = 'inset 0 2px 6px rgba(0,0,0,0.5), 0 0 0 1px rgba(60,50,40,0.5), 0 0 15px rgba(255,215,0,0.8), inset 0 0 15px rgba(255,215,0,0.3)';
        setTimeout(() => { frame.style.boxShadow = ''; }, 200);
    }
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
}

function spinReel(reel, baseDuration, finalSymbol, reelIndex) {
    return new Promise(resolve => {
        const inner = reel.querySelector('.reel-inner');
        
        // Генерируем длинную ленту
        const cycles = 4;
        const stripSymbols = [];
        for (let c = 0; c < 3; c++) {
            for (let i = 0; i < SYMBOLS_PER_REEL; i++) {
                stripSymbols.push(getRandomSymbol());
            }
        }
        for (let i = 0; i < SYMBOLS_PER_REEL - 1; i++) {
            stripSymbols.push(getRandomSymbol());
        }
        stripSymbols.push(finalSymbol);
        
        inner.innerHTML = stripSymbols.map(s => 
            `<div class="reel-symbol" style="color: ${s.color}" data-name="${s.name}">${s.emoji}</div>`
        ).join('');
        
        const START_POSITION = -3240;
        const END_POSITION = -5160;
        
        inner.style.transform = `translateY(${START_POSITION}px)`;
        
        let stopTime = null;
        const startTime = Date.now();
        
        function animate() {
            if (!isSpinning && stopTime === null) return;
            
            const elapsed = Date.now() - startTime;
            
            if (stopRequested[reelIndex] && stopTime === null) {
                stopTime = elapsed;
            }
            
            let easedProgress;
            
            if (stopTime !== null) {
                // Ручная остановка: плавное затухание за 500мс
                const stopElapsed = elapsed - stopTime;
                const stopProgress = Math.min(stopElapsed / 500, 1);
                easedProgress = easeOutCubic(stopProgress);
                
                if (stopProgress >= 1) {
                    inner.style.transform = `translateY(${END_POSITION}px)`;
                    resolve();
                    return;
                }
            } else {
                // Автоматическое ПЛАВНОЕ замедление каждого барабана отдельно
                // Используем easeOutQuart для естественного замедления
                const progress = Math.min(elapsed / baseDuration, 1);
                easedProgress = easeOutQuart(progress);
                
                if (progress >= 1) {
                    inner.style.transform = `translateY(${END_POSITION}px)`;
                    resolve();
                    return;
                }
            }
            
            const currentPosition = START_POSITION + (END_POSITION - START_POSITION) * easedProgress;
            inner.style.transform = `translateY(${currentPosition}px)`;
            
            requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
    });
}

function createParticles(count = 20) {
    const particles = ['💎', '⭐', '💰', '🎰', '✨', '💫', '🌟', '7️⃣'];
    const machineRect = machine.getBoundingClientRect();
    const centerX = machineRect.left + machineRect.width / 2;
    const centerY = machineRect.top + machineRect.height * 0.3;
    
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.textContent = particles[Math.floor(Math.random() * particles.length)];
            particle.style.left = `${centerX + (Math.random() - 0.5) * 200}px`;
            particle.style.top = `${centerY}px`;
            particle.style.animationDelay = `${Math.random() * 0.3}s`;
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 3000);
        }, i * 25);
    }
}

function shakeMachine() {
    machine.classList.add('shaking');
    setTimeout(() => machine.classList.remove('shaking'), 350);
}

function animatePointer() {
    resultPointer.classList.add('hit');
    setTimeout(() => resultPointer.classList.remove('hit'), 600);
}

async function spin() {
    if (isSpinning) return;
    
    isSpinning = true;
    stopRequested = [false, false, false];
    
    const finalSymbols = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    
    shakeMachine();
    
    // ВСЕ БАРАБАНЫ ЗАПУСКАЮТСЯ ОДНОВРЕМЕННО
    // Каждый замедляется СВОИМ темпом (разная длительность)
    const spin1 = spinReel(reelElements[0], 1250, finalSymbols[0], 0);
    const spin2 = spinReel(reelElements[1], 1600, finalSymbols[1], 1);
    const spin3 = spinReel(reelElements[2], 2000, finalSymbols[2], 2);
    
    await Promise.all([spin1, spin2, spin3]);
    
    isSpinning = false;
    
    setTimeout(() => {
        checkResult(finalSymbols);
        animatePointer();
    }, 150);
}

function checkResult(symbols) {
    const names = symbols.map(s => s.name);
    const isJackpot = names[0] === names[1] && names[1] === names[2] && 
                      (names[0] === 'diamond' || names[0] === 'star' || names[0] === 'seven');
    const isWin = names[0] === names[1] && names[1] === names[2];
    
    if (isWin) {
        if (isJackpot) {
            createParticles(30);
        }
    }
}

// Запуск: клик по корпусу, пробел, мобильная кнопка
machine.addEventListener('click', (e) => {
    if (!isSpinning && !e.target.closest('.mobile-spin-btn') && !e.target.closest('.reel')) {
        spin();
    }
});

if (mobileSpinBtn) {
    mobileSpinBtn.addEventListener('click', spin);
    mobileSpinBtn.addEventListener('touchstart', (e) => { e.preventDefault(); if (!isSpinning) spin(); }, { passive: false });
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isSpinning) {
        e.preventDefault();
        spin();
    }
    if (isSpinning) {
        if (e.code === 'Digit1' && !stopRequested[0]) requestStop(0);
        if (e.code === 'Digit2' && !stopRequested[1]) requestStop(1);
        if (e.code === 'Digit3' && !stopRequested[2]) requestStop(2);
    }
});

initReels();
