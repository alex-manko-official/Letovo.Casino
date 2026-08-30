const SYMBOLS = [
    { emoji: "7",  weight: 8,  color: "#b51d18", name: "seven" },
    { emoji: "🍒", weight: 25, color: "#c51f1b", name: "cherry" },
    { emoji: "🍋", weight: 20, color: "#d3a500", name: "lemon" },
    { emoji: "🍊", weight: 18, color: "#c96f10", name: "orange" },
    { emoji: "🍇", weight: 12, color: "#7547a8", name: "grapes" },
    { emoji: "🔔", weight: 10, color: "#b58a18", name: "bell" },
    { emoji: "★", weight: 5,  color: "#b58a18", name: "star" },
    { emoji: "◆", weight: 2,  color: "#2b7b8a", name: "diamond" },
    { emoji: "🍌", weight: 15, color: "#c99f0d", name: "banana" }
];

const REEL_HEIGHT = 63;
const ANIMATION_SYMBOLS = 35;

const reelElements = [
    document.getElementById("reel1"),
    document.getElementById("reel2"),
    document.getElementById("reel3")
];

const machine = document.getElementById("machine");
const lever = document.getElementById("lever");
const spinButton = document.getElementById("spinButton");
const resultPointer = document.getElementById("resultPointer");

let isSpinning = false;


// Background music and start sound
const bgMusic = document.getElementById('background-music');
const startSound = document.getElementById('start-sound');

// Playlist of background tracks (add more files as needed)
const musicTracks = [
  'assets/music/background.mp3'
  // , 'assets/music/track2.mp3', 'assets/music/track3.mp3'
];
let musicIndex = 0;
let bgStarted = false;
const hasInteracted = localStorage.getItem('audioInitialized') === 'true';

// Ensure background music only starts after start sound ends
startSound.addEventListener('ended', () => {
  tryStartBg();
});

function tryStartStart() {
  // Attempt to play start sound each time (if not already playing)
  if (startSound.paused) {
    startSound.play().catch(() => {});
  }
}

function playNextTrack() {
  if (musicIndex >= musicTracks.length) {
    // finished playlist
    return;
  }
  bgMusic.src = musicTracks[musicIndex];
  bgMusic.muted = false;
  bgMusic.play().catch(() => {});
}

function tryStartBg() {
  if (!bgStarted) {
    bgStarted = true;
    playNextTrack();
  }
}

// Advance playlist when a track ends
bgMusic.addEventListener('ended', () => {
  musicIndex++;
  if (musicIndex >= musicTracks.length) {
    musicIndex = 0;
  }
  playNextTrack();
});

// On load: if user has interacted before, try to play start sound immediately
if (hasInteracted) {
    tryStartStart();
}

// First user interaction (click, touch, scroll, keydown) starts audio if not already started
function unlockAudio() {
    tryStartStart();
    // Mark that the user has interacted so that on future loads we try to play audio automatically
    localStorage.setItem('audioInitialized', 'true');
    // Remove listeners
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('scroll', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
}

window.addEventListener('click', unlockAudio);
window.addEventListener('touchstart', unlockAudio);
window.addEventListener('scroll', unlockAudio);
window.addEventListener('keydown', unlockAudio);


/* =========================================
   ВЫБОР СЛУЧАЙНОГО СИМВОЛА
========================================= */

function pickSymbol() {
    const totalWeight = SYMBOLS.reduce(
        (sum, symbol) => sum + symbol.weight,
        0
    );

    let value = Math.random() * totalWeight;

    for (const symbol of SYMBOLS) {
        value -= symbol.weight;

        if (value <= 0) {
            return symbol;
        }
    }

    return SYMBOLS[0];
}


/* =========================================
   HTML СИМВОЛА
========================================= */

function symbolMarkup(symbol) {
    return `
        <div
            class="reel-symbol"
            style="color:${symbol.color}"
            data-name="${symbol.name}"
        >
            ${symbol.emoji}
        </div>
    `;
}


/* =========================================
   НАЧАЛЬНОЕ СОСТОЯНИЕ БАРАБАНОВ
========================================= */

function renderInitialReel(reel) {
    const symbols = Array.from(
        { length: 12 },
        pickSymbol
    );

    reel.innerHTML = `
        <div class="reel-inner">
            ${symbols.map(symbolMarkup).join("")}
        </div>
    `;

    const inner = reel.querySelector(".reel-inner");

    inner.style.transform =
        `translateY(-${REEL_HEIGHT * 4}px)`;
}


function initReels() {
    reelElements.forEach(renderInitialReel);
}


/* =========================================
   EASING
========================================= */

function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
}


/* =========================================
   ВРАЩЕНИЕ ОДНОГО БАРАБАНА
========================================= */

function spinSingleReel(
    reel,
    finalSymbol,
    duration,
    extraDelay = 0
) {
    return new Promise(resolve => {

        const inner =
            reel.querySelector(".reel-inner");

        /*
         * Создаём длинную ленту символов.
         * Последний символ — гарантированный результат.
         */

        const sequence = Array.from(
            { length: ANIMATION_SYMBOLS },
            pickSymbol
        );

        sequence.push(
            pickSymbol(),
            pickSymbol(),
            finalSymbol
        );

        inner.innerHTML =
            sequence.map(symbolMarkup).join("");

        /*
         * Начальная позиция.
         */

        const start =
            -REEL_HEIGHT * 5;

        /*
         * Останавливаемся так,
         * чтобы finalSymbol оказался
         * примерно по центру окна.
         */

        const end =
            -REEL_HEIGHT * (sequence.length - 3);

        const startedAt =
            performance.now();


        function frame(now) {

            const elapsed =
                now - startedAt;

            const progress =
                Math.min(elapsed / duration, 1);

            const eased =
                easeOutQuart(progress);

            const position =
                start +
                (end - start) * eased;

            inner.style.transform =
                `translateY(${position}px)`;


            if (progress < 1) {

                requestAnimationFrame(frame);

            } else {

                /*
                 * Фиксируем точную конечную позицию.
                 */

                inner.style.transform =
                    `translateY(${end}px)`;

                setTimeout(
                    resolve,
                    extraDelay
                );
            }
        }


        requestAnimationFrame(frame);
    });
}


/* =========================================
   РЫЧАГ
========================================= */

function pullLever() {

    lever.classList.add("pulled");

    setTimeout(() => {
        lever.classList.remove("pulled");
    }, 290);
}


/* =========================================
   ЛЁГКАЯ ТРЯСКА АВТОМАТА
========================================= */

function shakeMachine() {

    machine.classList.remove("shaking");

    /*
     * Перезапускаем CSS animation.
     */

    void machine.offsetWidth;

    machine.classList.add("shaking");

    setTimeout(() => {
        machine.classList.remove("shaking");
    }, 380);
}


/* =========================================
   АНИМАЦИЯ УКАЗАТЕЛЯ
========================================= */

function hitPointer() {

    resultPointer.classList.remove("hit");

    void resultPointer.offsetWidth;

    resultPointer.classList.add("hit");

    setTimeout(() => {
        resultPointer.classList.remove("hit");
    }, 500);
}


/* =========================================
   ПАРТИКЛЫ ПРИ ВЫИГРЫШЕ
========================================= */

function createParticles(count = 24) {

    const particles = [
        "◆",
        "★",
        "✦",
        "7",
        "✧"
    ];

    const rect =
        machine.getBoundingClientRect();

    const originX =
        rect.left + rect.width * 0.45;

    const originY =
        rect.top + rect.height * 0.28;


    for (let i = 0; i < count; i++) {

        setTimeout(() => {

            const particle =
                document.createElement("div");

            particle.className =
                "particle";

            particle.textContent =
                particles[
                    Math.floor(
                        Math.random() *
                        particles.length
                    )
                ];


            particle.style.left =
                `${originX +
                    (Math.random() - 0.5) * 220}px`;

            particle.style.top =
                `${originY}px`;


            /*
             * Золотой или красный цвет.
             */

            particle.style.color =
                Math.random() > 0.5
                    ? "#d1a63b"
                    : "#c32822";


            document.body.appendChild(
                particle
            );


            setTimeout(() => {
                particle.remove();
            }, 1900);

        }, i * 22);
    }
}


/* =========================================
   ПРОВЕРКА РЕЗУЛЬТАТА
========================================= */

function checkResult(symbols) {

    const names =
        symbols.map(
            symbol => symbol.name
        );

    const win =
        names[0] === names[1] &&
        names[1] === names[2];


    if (win) {

        const bigWin =
            names[0] === "seven" ||
            names[0] === "diamond";

        createParticles(
            bigWin ? 34 : 18
        );
    }
}


/* =========================================
   ОСНОВНОЙ SPIN
========================================= */

async function spin() {

    /*
     * Не разрешаем запустить второй spin,
     * пока первый ещё идёт.
     */

    if (isSpinning) {
        return;
    }

    isSpinning = true;


    /*
     * Движение рычага.
     */

    pullLever();


    /*
     * Лёгкая физическая тряска автомата.
     */

    shakeMachine();


    /*
     * Выбираем итоговые символы
     * заранее.
     */

    const finalSymbols = [
        pickSymbol(),
        pickSymbol(),
        pickSymbol()
    ];


    try {

        /*
         * Каждый барабан останавливается
         * немного позже предыдущего.
         */

        await Promise.all([

            spinSingleReel(
                reelElements[0],
                finalSymbols[0],
                900
            ),

            spinSingleReel(
                reelElements[1],
                finalSymbols[1],
                1250,
                220
            ),

            spinSingleReel(
                reelElements[2],
                finalSymbols[2],
                1600,
                440
            )

        ]);


        /*
         * Проверяем выигрыш.
         */

        checkResult(finalSymbols);


        /*
         * Анимация красного указателя.
         */

        hitPointer();


    } finally {

        isSpinning = false;
    }
}


/* =========================================
   НАЖАТИЕ НА РЫЧАГ
========================================= */

if (lever) {

    lever.addEventListener(
        "click",
        spin
    );
}


/* =========================================
   КНОПКА SPIN НА МОБИЛЬНОМ
========================================= */

if (spinButton) {

    spinButton.addEventListener(
        "click",
        spin
    );
}


/* =========================================
   КЛИК ПО АВТОМАТУ
========================================= */

machine.addEventListener(
    "click",
    event => {

        /*
         * Не запускаем spin,
         * если пользователь нажал
         * непосредственно на барабан.
         */

        const clickedReel =
            event.target.closest(".reel");

        const clickedLever =
            event.target.closest("#lever");

        const clickedButton =
            event.target.closest("#spinButton");


        if (
            !clickedReel &&
            !clickedLever &&
            !clickedButton
        ) {
            spin();
        }
    }
);


/* =========================================
   КЛАВИАТУРА
========================================= */

window.addEventListener(
    "keydown",
    event => {

        /*
         * Пробел или Enter запускают автомат.
         */

        if (
            event.code === "Space" ||
            event.code === "Enter"
        ) {

            event.preventDefault();

            spin();
        }
    }
);


/* =========================================
   ЗАПУСК
========================================= */

initReels();