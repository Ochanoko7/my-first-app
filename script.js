const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const statusLabel = document.querySelector("#game-status");
const resetButton = document.querySelector("#reset-button");

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;
const WORLD_WIDTH = 3600;
const FLOOR_Y = 455;
const GRAVITY = 1800;
const MOVE_SPEED = 280;
const JUMP_SPEED = 690;

const platforms = [
    { x: 0, y: FLOOR_Y, width: 600, height: 120 },
    { x: 700, y: FLOOR_Y, width: 430, height: 120 },
    { x: 1230, y: FLOOR_Y, width: 650, height: 120 },
    { x: 1980, y: FLOOR_Y, width: 520, height: 120 },
    { x: 2600, y: FLOOR_Y, width: 1000, height: 120 },
    { x: 280, y: 365, width: 135, height: 18 },
    { x: 805, y: 355, width: 150, height: 18 },
    { x: 1450, y: 350, width: 155, height: 18 },
    { x: 1745, y: 385, width: 100, height: 18 },
    { x: 2170, y: 350, width: 165, height: 18 },
    { x: 2760, y: 365, width: 145, height: 18 },
    { x: 3100, y: 335, width: 150, height: 18 },
];

const hazards = [
    { x: 490, width: 52 },
    { x: 1010, width: 52 },
    { x: 1575, width: 58 },
    { x: 1870, width: 58 },
    { x: 2350, width: 65 },
    { x: 2920, width: 54 },
];

const gems = [
    { x: 340, y: 324, collected: false },
    { x: 850, y: 313, collected: false },
    { x: 1510, y: 308, collected: false },
    { x: 2235, y: 308, collected: false },
    { x: 3165, y: 293, collected: false },
];

const clouds = Array.from({ length: 17 }, (_, index) => ({
    x: index * 250 + (index % 3) * 75,
    y: 55 + (index * 47) % 150,
    size: 0.65 + (index % 4) * 0.16,
}));

const keys = { left: false, right: false };
const player = { x: 70, y: FLOOR_Y - 42, width: 30, height: 42, velocityX: 0, velocityY: 0, grounded: false };
let cameraX = 0;
let elapsed = 0;
let gameState = "playing";
let collectedCount = 0;
let previousTime = 0;

function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * pixelRatio);
    canvas.height = Math.round(bounds.height * pixelRatio);
    ctx.setTransform(canvas.width / VIEW_WIDTH, 0, 0, canvas.height / VIEW_HEIGHT, 0, 0);
}

function resetGame() {
    player.x = 70;
    player.y = FLOOR_Y - player.height;
    player.velocityX = 0;
    player.velocityY = 0;
    player.grounded = false;
    cameraX = 0;
    collectedCount = 0;
    gameState = "playing";
    gems.forEach((gem) => { gem.collected = false; });
    statusLabel.textContent = "矢印キーで冒険をはじめよう";
}

function setStatus(message) {
    statusLabel.textContent = message;
}

function handleKey(event, isPressed) {
    const key = event.key.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", " "].includes(key)) event.preventDefault();
    if (key === "arrowleft" || key === "a") keys.left = isPressed;
    if (key === "arrowright" || key === "d") keys.right = isPressed;
    if ((key === " " || key === "arrowup" || key === "w") && isPressed && !event.repeat && player.grounded && gameState === "playing") {
        player.velocityY = -JUMP_SPEED;
        player.grounded = false;
    }
    if (key === "r" && isPressed) resetGame();
}

window.addEventListener("keydown", (event) => handleKey(event, true));
window.addEventListener("keyup", (event) => handleKey(event, false));
window.addEventListener("blur", () => {
    keys.left = false;
    keys.right = false;
});
resetButton.addEventListener("click", resetGame);
window.addEventListener("resize", resizeCanvas);

document.querySelectorAll("[data-control]").forEach((button) => {
    const control = button.dataset.control;
    const release = () => {
        if (control === "jump") return;
        keys[control] = false;
        button.classList.remove("is-pressed");
    };

    button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        button.classList.add("is-pressed");
        if (control === "jump") {
            if (player.grounded && gameState === "playing") {
                player.velocityY = -JUMP_SPEED;
                player.grounded = false;
            }
        } else {
            keys[control] = true;
        }
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
});

function overlaps(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
        a.y < b.y + b.height && a.y + a.height > b.y;
}

function update(delta) {
    if (gameState !== "playing") return;
    elapsed += delta;

    player.velocityX = (Number(keys.right) - Number(keys.left)) * MOVE_SPEED;
    player.x = Math.max(0, Math.min(WORLD_WIDTH - player.width, player.x + player.velocityX * delta));

    for (const platform of platforms) {
        if (overlaps(player, platform)) {
            if (player.velocityX > 0) player.x = platform.x - player.width;
            else if (player.velocityX < 0) player.x = platform.x + platform.width;
        }
    }

    const previousBottom = player.y + player.height;
    player.velocityY += GRAVITY * delta;
    player.y += player.velocityY * delta;
    player.grounded = false;

    for (const platform of platforms) {
        if (!overlaps(player, platform)) continue;
        if (player.velocityY >= 0 && previousBottom <= platform.y + 2) {
            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.grounded = true;
        } else if (player.velocityY < 0) {
            player.y = platform.y + platform.height;
            player.velocityY = 0;
        }
    }

    const playerBox = { x: player.x + 4, y: player.y + 5, width: player.width - 8, height: player.height - 7 };
    for (const gem of gems) {
        if (!gem.collected && overlaps(playerBox, { x: gem.x - 13, y: gem.y - 15, width: 26, height: 30 })) {
            gem.collected = true;
            collectedCount += 1;
            setStatus(`光るかけらを見つけた！ ${collectedCount} / ${gems.length}`);
        }
    }

    for (const hazard of hazards) {
        if (overlaps(playerBox, { x: hazard.x, y: FLOOR_Y - 22, width: hazard.width, height: 22 })) {
            resetGame();
            setStatus("トゲにぶつかった！ もう一度チャレンジしよう");
            return;
        }
    }

    if (player.y > VIEW_HEIGHT + 80) {
        resetGame();
        setStatus("谷に落ちちゃった！ もう一度チャレンジしよう");
        return;
    }

    if (player.x + player.width >= WORLD_WIDTH - 95) {
        gameState = "won";
        setStatus(`ゴール！ 光るかけら ${collectedCount} / ${gems.length} 個`);
    }

    cameraX = Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, player.x - VIEW_WIDTH * 0.36));
}

function roundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
}

function drawCloud(x, y, size) {
    ctx.beginPath();
    ctx.ellipse(x, y, 37 * size, 11 * size, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 16 * size, y - 5 * size, 18 * size, 15 * size, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 5 * size, y - 10 * size, 23 * size, 19 * size, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 23 * size, y - 3 * size, 17 * size, 13 * size, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    sky.addColorStop(0, "#87c4d2");
    sky.addColorStop(0.67, "#b7dfd9");
    sky.addColorStop(1, "#e1edcf");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const sunlight = ctx.createRadialGradient(760, 110, 8, 760, 110, 180);
    sunlight.addColorStop(0, "rgba(255,244,191,0.7)");
    sunlight.addColorStop(1, "rgba(255,244,191,0)");
    ctx.fillStyle = sunlight;
    ctx.fillRect(570, 0, 390, 300);
    ctx.fillStyle = "#fff2c4";
    ctx.beginPath();
    ctx.arc(760, 110, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.53)";
    for (const cloud of clouds) {
        const x = ((cloud.x - cameraX * 0.2) % (WORLD_WIDTH + 240) + WORLD_WIDTH + 240) % (WORLD_WIDTH + 240) - 70;
        drawCloud(x, cloud.y, cloud.size);
    }

    for (let layer = 0; layer < 3; layer += 1) {
        const parallax = 0.13 + layer * 0.1;
        const y = 340 + layer * 36;
        const period = 540;
        const offset = (cameraX * parallax) % period;
        ctx.fillStyle = ["#94cbbf", "#78b7a5", "#65a78f"][layer];
        ctx.beginPath();
        ctx.moveTo(0, VIEW_HEIGHT);
        for (let x = -period; x <= VIEW_WIDTH + period; x += 1) {
            const worldX = x + offset;
            const hill = y + Math.sin(worldX / 95 + layer) * 25 + Math.sin(worldX / 43) * 8;
            ctx.lineTo(x, hill);
        }
        ctx.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
        ctx.closePath();
        ctx.fill();
    }
}

function drawPlatforms() {
    for (const platform of platforms) {
        const x = platform.x - cameraX;
        if (x + platform.width < -10 || x > VIEW_WIDTH + 10) continue;
        if (platform.y === FLOOR_Y) {
            ctx.fillStyle = "#4d806a";
            ctx.fillRect(x, platform.y, platform.width, platform.height);
            ctx.fillStyle = "#82b278";
            ctx.fillRect(x, platform.y, platform.width, 9);
            ctx.fillStyle = "rgba(29,66,57,0.2)";
            for (let tuft = 0; tuft < platform.width; tuft += 34) {
                ctx.fillRect(x + tuft + 12, platform.y + 28, 3, 13 + (tuft % 3) * 5);
            }
        } else {
            roundedRect(x, platform.y, platform.width, platform.height, 8);
            ctx.fillStyle = "#598c72";
            ctx.fill();
            roundedRect(x + 4, platform.y + 3, platform.width - 8, 5, 3);
            ctx.fillStyle = "#acd18b";
            ctx.fill();
            ctx.fillStyle = "rgba(31,76,65,0.28)";
            ctx.fillRect(x + 13, platform.y + 12, platform.width - 26, 2);
        }
    }

    for (const hazard of hazards) {
        const x = hazard.x - cameraX;
        if (x + hazard.width < 0 || x > VIEW_WIDTH) continue;
        const count = Math.floor(hazard.width / 17);
        for (let index = 0; index < count; index += 1) {
            const spikeX = x + index * 17;
            ctx.beginPath();
            ctx.moveTo(spikeX, FLOOR_Y);
            ctx.lineTo(spikeX + 8.5, FLOOR_Y - 22);
            ctx.lineTo(spikeX + 17, FLOOR_Y);
            ctx.closePath();
            ctx.fillStyle = "#f18d7a";
            ctx.fill();
            ctx.fillStyle = "rgba(255,221,181,0.65)";
            ctx.fillRect(spikeX + 8, FLOOR_Y - 8, 1, 5);
        }
    }
}

function drawGem(gem) {
    if (gem.collected) return;
    const x = gem.x - cameraX;
    if (x < -35 || x > VIEW_WIDTH + 35) return;
    const bob = Math.sin(elapsed * 3 + gem.x) * 4;
    ctx.save();
    ctx.translate(x, gem.y + bob);
    ctx.shadowColor = "rgba(255,241,171,0.85)";
    ctx.shadowBlur = 18;
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#fff2b1";
    roundedRect(-8, -8, 16, 16, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fffdf0";
    roundedRect(-4, -4, 7, 7, 2);
    ctx.fill();
    ctx.restore();
}

function drawGoal() {
    const x = WORLD_WIDTH - 82 - cameraX;
    ctx.fillStyle = "#4f6d68";
    ctx.fillRect(x, FLOOR_Y - 115, 5, 115);
    ctx.fillStyle = "#fff1b5";
    ctx.beginPath();
    ctx.arc(x + 2.5, FLOOR_Y - 120, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = gameState === "won" ? "#f5a978" : "#f18d7a";
    ctx.beginPath();
    ctx.moveTo(x + 5, FLOOR_Y - 113);
    ctx.lineTo(x + 48, FLOOR_Y - 101);
    ctx.lineTo(x + 5, FLOOR_Y - 87);
    ctx.closePath();
    ctx.fill();
}

function drawPlayer() {
    const x = player.x - cameraX;
    const y = player.y;
    const walking = Math.abs(player.velocityX) > 0 && player.grounded && gameState === "playing";
    const step = walking ? Math.sin(elapsed * 17) * 2 : 0;

    ctx.fillStyle = "rgba(36,68,66,0.18)";
    ctx.beginPath();
    ctx.ellipse(x + player.width / 2, FLOOR_Y + 2, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#43556a";
    roundedRect(x + 5, y + 31, 8, 11 + step, 4);
    ctx.fill();
    roundedRect(x + 18, y + 31, 8, 11 - step, 4);
    ctx.fill();

    ctx.fillStyle = "#ffb889";
    roundedRect(x + 2, y + 9, 26, 25, 9);
    ctx.fill();
    ctx.fillStyle = "#f5ca91";
    ctx.beginPath();
    ctx.arc(x + 15, y + 13, 14, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + 1, y + 12, 28, 5);

    ctx.fillStyle = "#263d4d";
    const facing = player.velocityX < 0 ? -1 : 1;
    ctx.beginPath();
    ctx.arc(x + 17 + facing * 3, y + 22, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(233,119,111,0.5)";
    ctx.beginPath();
    ctx.arc(x + 23, y + 27, 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawOverlay() {
    const collected = gems.filter((gem) => gem.collected).length;
    ctx.save();
    roundedRect(17, 17, 110, 37, 9);
    ctx.fillStyle = "rgba(35,66,75,0.2)";
    ctx.fill();
    ctx.fillStyle = "#fff3c7";
    ctx.font = "15px 'DM Sans', sans-serif";
    ctx.fillText("✦", 29, 41);
    ctx.fillStyle = "#fff";
    ctx.font = "600 13px 'DM Sans', sans-serif";
    ctx.fillText(`${collected} / ${gems.length}`, 52, 40);

    if (gameState === "won") {
        ctx.fillStyle = "rgba(19,43,50,0.32)";
        ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
        roundedRect(280, 185, 400, 164, 20);
        ctx.fillStyle = "rgba(24,45,57,0.88)";
        ctx.fill();
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff2b1";
        ctx.font = "24px 'DM Sans', 'Noto Sans JP', sans-serif";
        ctx.fillText("丘をこえた！", VIEW_WIDTH / 2, 238);
        ctx.fillStyle = "#eef4f2";
        ctx.font = "14px 'DM Sans', 'Noto Sans JP', sans-serif";
        ctx.fillText(`光るかけらを ${collected} / ${gems.length} 個みつけたよ`, VIEW_WIDTH / 2, 273);
        ctx.fillStyle = "#a8e8cf";
        ctx.font = "12px 'DM Sans', 'Noto Sans JP', sans-serif";
        ctx.fillText("↻ リスタートしてもう一度あそぼう", VIEW_WIDTH / 2, 310);
    }
    ctx.restore();
}

function draw() {
    drawBackground();
    drawPlatforms();
    gems.forEach(drawGem);
    drawGoal();
    drawPlayer();
    drawOverlay();
}

function frame(timestamp) {
    const delta = previousTime === 0 ? 0 : Math.min((timestamp - previousTime) / 1000, 1 / 30);
    previousTime = timestamp;
    update(delta);
    draw();
    window.requestAnimationFrame(frame);
}

resizeCanvas();
window.requestAnimationFrame(frame);
