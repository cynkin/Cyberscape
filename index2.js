const canvas = document.getElementById('canvas');
const c = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const RAND1 = Math.random();
const RAND2 = Math.random();
const SEED = Math.floor((RAND1 * 1000000 + 1) * (RAND2 * 10000 + 1));
console.log(SEED)

let systemHealth = 70;
let isOpen = false;
let ALERT = false;

const TILES_PER_PANEL = 5;
const TILE_SIZE = 50;
const PANEL_PADDING = TILE_SIZE;
const PANEL_SIZE = TILE_SIZE * TILES_PER_PANEL;
const MIN_COLONY_SIZE = 2;  // Minimum 2x2 panels
const MAX_COLONY_SIZE = 4;  // Maximum 4x4 panels
const COLONY_MARGIN = 1;

const TOWER_DETECTION_RANGE = 150;
const TOWER_DETECTION_ANGLE = Math.PI/3; // 60 degree cone
const TOWER_ROTATION_SPEED = 0.007;
const TOWER_DAMAGE_RATE = 0.1;

let lastShotTime = 0;
let FIRE_RATE = 200;
let BULLET_DAMAGE = 40;
let BULLET_BOUNCE = true;
let BULLET_RADIAL = false;

let paused = false;

const images = {
    speed : new Image(),
    rate : new Image(),
    health :  new Image(),
    pistol : new Image(),
    smg : new Image(),
    radial : new Image(),
    sniper : new Image(),
    golden : new Image(),
    light : new Image(),
    heavy : new Image(),
}
images.speed.src = 'images/speed.png';
images.rate.src = 'images/rate.png';
images.health.src = 'images/health.png';
images.pistol.src = 'images/pistol.png';
images.smg.src = 'images/smg.png';
images.radial.src = 'images/radial.png';
images.sniper.src = 'images/sniper.png';
images.golden.src = 'images/golden.png';
images.light.src = 'images/light.png';
images.heavy.src = 'images/heavy.png';

const GUNS = [
    {type: "gun", name : "pistol", owned: true, cost: 0, rate: 200, speed:4, damage:50, radial: false, bounce:true, image: images.pistol, ammo:"♾️"},
    {type: "gun",name : "smg", owned: false, cost: 2, rate: 100, speed:5, damage:50, radial: false, bounce:true, image: images.smg, ammo:50},
    {type: "gun",name : "radial", owned: false, cost: 3, rate: 300, speed:3, damage:90, radial: true, bounce:true, image: images.radial, ammo:25},
    {type: "gun",name : "sniper", owned: false, cost: 1, rate: 300, speed:3, damage:150, radial: false, bounce:true, image: images.sniper, ammo:20},
    {type: "gun",name : "golden sniper", owned: false, cost: 3, rate: 500, speed:2, damage:999, radial: false, bounce:false, image: images.golden, ammo:10},
]

const ENHANCEMENTS = [
    {name: "movement speed", owned: false, cost: 2, image: images.speed},
    {name: "rate", owned: false, cost: 3, image: images.rate},
    {name: "health", owned: false, cost: 3, image: images.health}];
const SHIELDS = [
    {name: "light shield", owned: false, cost: 2, image: images.light},
    {name: "heavy shield", owned: false, cost: 4, image: images.heavy},];

const ALL_SKILLS = [...ENHANCEMENTS, ...SHIELDS];

const OTHER =[
    {name: "teleport", owned: true, cost: 3, emoji:"🌀", size: 120, count:1},
    {type: "mine", name:"basic mine", owned: false, cost: 10, time:30, emoji:"🗃️", size:85, count:0},
    {type: "mine", name: "enhanced mine", owned: true, cost: 20, time:20, emoji:"🗃️", size:100, count:1},
    {type: "mine", name:"super mine", owned: false, cost: 35, time:10, emoji:"🗃️", size:120, count:0},
]

let hoveredItem = null;
const CELL_WIDTH = canvas.width / 5;

let timeOut = null;

const spawn = {
    x: 0,
    y: 0,
}

const mark = {
    x: 0,
    y: 0,
}
const bots = [];

const panels = new Map();
const towers = [];
const towerKeys = new Set();
const bullets = [];
const items = [];
const itemKeys = new Set();
let keysCollected = 0;
let shardsCollected = 0;

const seenPanels = new Set();
let placedAurex = false;

const HUB_PLACEMENT_INTERVAL = canvas.width;
const hub = {x: 2*canvas.width, y: 2*canvas.height};
const hubs = [];
hubs.push(hub);


let dx = 0.1;
let dy = 0.1;
let acceleration = 0.5;

let lastCamera = {
    x: canvas.width / 2,
    y: canvas.height / 2,
}

const cursor = {
    x: innerWidth / 2,
    y: innerHeight / 2
}

const camera = {
    x: 0,
    y: 0,
    speed :5
}

const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

const datamines = [];
const teleports = [];

let SELECTED = 'none';
let tp = 0;
let canTeleport = true;
let teleportUIOpen = false;
let hoveredTp = null;
let lastTile = null;

let inventoryOpen = false;
let EQUIPPED = 'pistol';
let spawnRate = 10000;
let gameOver = false;

let SCORE = 0;
let hoveredButton = null;

const pulseRadius = canvas.width * 0.6 - 4;
const bgGradient = c.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    pulseRadius * 0.2,
    canvas.width / 2,
    canvas.height / 2,
    pulseRadius
);
bgGradient.addColorStop(0, 'rgba(40, 40, 50, 0.15)');
bgGradient.addColorStop(1, 'rgba(10, 10, 20, 0.85)');

let shootingInterval = null;

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;

    if(e.key === 'p'){
        paused = !paused;
    }

    if(e.key === 'i' || e.key === 'I'){
        inventoryOpen = !inventoryOpen;
    }

    if(e.key === 'm'){
        SELECTED = 'mark';
    }

    if(e.key === 'r' || e.key === 'R'){
        location.reload()
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
        // if(e.key ==='w' || e.key ==='s') dy = 0.1;
        // if(e.key ==='a' || e.key ==='d') dx = 0.1;
    }

    // if (!keys.w && !keys.a && !keys.s && !keys.d) {
    //     lastKey = '';
    // }
});

window.addEventListener('resize', () => {
    location.reload();
    canvas.width = innerWidth;
    canvas.height = innerHeight;

    generate();
    // player.draw(canvas.width/2, canvas.height/2);

})

window.addEventListener('mousemove', (e) => {
    cursor.x = e.clientX;
    cursor.y = e.clientY;
})

window.addEventListener('contextmenu', (e)=>{
    e.preventDefault(); // prevents the context menu from opening

    const tile = getTile(cursor.x, cursor.y);
    const b = OTHER.find(g => g.name === SELECTED);
    switch(SELECTED){
        case 'mark':
            if(tile && !tile.isColony && !tile.isMine && !tile.center && !tile.hasItem){

                if(lastTile && lastTile.type === 6) {
                    lastTile.type = null;
                }

                tile.type = 6;
                mark.x = tile.x + TILE_SIZE / 2 + camera.x;
                mark.y = tile.y + TILE_SIZE / 2 + camera.y;
                lastTile = tile;
            }
                 break;
        case 'basic mine':
            if(b.count > 0) {
                if(!tile || tile.isColony || tile.isMine || tile.isHub || tile.hasItem){
                    console.log("Cannot place datamine on colony tile.");
                    datamines.pop();
                }
                else{
                    const mine = new Datamine(tile, 30, 0.7);
                    datamines.push(mine);
                    b.count--;
                    if(b.count === 0){
                        b.owned = false;
                        SELECTED = 'none';
                    }
                    tile.isMine = true;

                }
            }
            break;
        case 'enhanced mine':
            if(b.count > 0) {
                if(!tile || tile.isColony || tile.isMine || tile.isHub || tile.hasItem){
                    console.log("Cannot place datamine on colony tile.");
                    datamines.pop();
                }
                else{
                    const mine = new Datamine(tile, 20, 0.9);
                    datamines.push(mine);
                    b.count--;
                    if(b.count === 0){
                        b.owned = false;
                        SELECTED = 'none';
                    }
                    tile.isMine = true;

                }
            }
            break;
        case 'super mine':
            if(b.count > 0) {
                if(!tile || tile.isColony || tile.isMine || tile.isHub || tile.hasItem){
                    console.log("Cannot place datamine on colony tile.");
                    datamines.pop();
                }
                else{
                    const mine = new Datamine(tile, 7, 1.1);
                    datamines.push(mine);
                    b.count--;
                    if(b.count === 0){
                        b.owned = false;
                        SELECTED = 'none';
                    }
                    tile.isMine = true;
                }
            }
            break;
        case 'teleport':
            if(!tile.isTp && b.count > 0 && tile && !tile.hasItem && !tile.isColony && !tile.isMine && !tile.isHub){
                tp++;
                tile.type = 9;
                tile.isTp = true;
                tile.tpNo = tp;
                // Store world position
                tile.worldX = tile.x + camera.x;
                tile.worldY = tile.y + camera.y;

                teleports.push({tile: tile, no: tp});
                b.count--;
                if(b.count === 0){
                    b.owned = false;
                    SELECTED = 'none';
                }
            }
            break;
    }
});

window.addEventListener('click', () =>{
    if(hoveredButton){
        location.reload();
    }

    if(isOpen && hoveredItem){
        // if(hoveredItem.owned) return;

        if(hoveredItem.type === 'mine'){
            if(keysCollected < hoveredItem.cost) return;
        }
        else if(shardsCollected < hoveredItem.cost) {
            return;
        }

        if(GUNS.includes(hoveredItem)) equip(hoveredItem.name);
        else if(OTHER.some(item => item.name === hoveredItem.name)) {

            const b = hoveredItem;
            switch(hoveredItem.name){
                case 'teleport': b.count++;
                                b.owned = true;
                                shardsCollected -= b.cost;
                                break;
                case 'basic mine': b.count++;
                                b.owned = true;
                                keysCollected -= b.cost;
                                break;
                case 'enhanced mine': b.count++;
                                b.owned = true;
                                keysCollected -= b.cost;
                                break;
                case 'super mine': b.count++;
                                b.owned = true;
                                keysCollected -= b.cost;
                                break;
            }
        }
        else enhance(hoveredItem.name);

    }
    else if(inventoryOpen && hoveredItem){
        if(hoveredItem.type === 'gun'){
            equip(hoveredItem.name);
        }
        else{
            SELECTED =hoveredItem.name;
        }
    }
    else if(teleportUIOpen && hoveredTp){
        move(hoveredTp.tile);
    }
    else {
        if(isOpen || teleportUIOpen || inventoryOpen) return;

        const now = Date.now();
        if(now - lastShotTime >= FIRE_RATE){
            if(player.isSafe) return;
            // if(EQUIPPED !== 'pistol'){
            //     const gun = GUNS.find(g =>  g.name === EQUIPPED);
            //     if(gun.ammo > 0) gun.ammo -=1;
            // }
            if(EQUIPPED !== 'pistol'){
                if(EQUIPPED.ammo>0) EQUIPPED.ammo--;
                else {
                    EQUIPPED.owned = false;
                    EQUIPPED = 'pistol';
                    equip('pistol')
                }
            }
            player.shoot();
            lastShotTime = now;
        }

    }
})

// window.addEventListener('mousedown', () =>{
//     if(isOpen || teleportUIOpen || inventoryOpen) return;
//
//     shootingInterval = setInterval(() => {
//         const now = Date.now();
//         if (now - lastShotTime >= FIRE_RATE) {
//             if (player.isSafe) return;
//
//             if (EQUIPPED !== 'pistol') {
//                 if (EQUIPPED.ammo > 0) {
//                     EQUIPPED.ammo--;
//                 } else {
//                     EQUIPPED.owned = false;
//                     EQUIPPED = 'pistol';
//                     equip('pistol');
//                 }
//             }
//
//             player.shoot();
//             lastShotTime = now;
//         }
//     }, 10); // interval granularity (can be tuned)
//
// })
//
// window.addEventListener('mouseup', () => {
//     clearInterval(shootingInterval);
//     shootingInterval = null;
// });

class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
}

class Panel{
    constructor(x, y, a, b) {
        this.worldX = x;
        this.worldY = y;
        this.panelX = a;
        this.panelY = b;
        this.colony = generateColony(a, b);
        this.key = `${a}-${b}`;

        this.tileMap = new Map();

    }

    draw(){

        const towerX = this.colony.startX + Math.floor(this.colony.width/2);
        const towerY = this.colony.startY + Math.floor(this.colony.height/2);

        const itemX = this.colony.startX + Math.floor(Math.random() * this.colony.width);
        const itemY = this.colony.startY + Math.floor(Math.random() * this.colony.height);


        for(let i = 0; i < TILES_PER_PANEL; i++){
            for(let j = 0; j < TILES_PER_PANEL; j++){
                const p = this.worldX + j * TILE_SIZE;
                const q = this.worldY + i * TILE_SIZE;

                const key = this.key + `-${p}-${q}`;

                const isColony = (
                    j >= this.colony.startX && j < this.colony.startX + this.colony.width &&
                    i >= this.colony.startY && i < this.colony.startY + this.colony.height
                )

                const isTower = isColony && (j === towerX && i === towerY);

                let isItem = false;
                if(Math.random() < 0.25) {
                    isItem = isColony && (j === itemX && i === itemY);
                }
                let type = 1;
                if(Math.random() < 0.15) {
                    type = 2;
                }
                else if(Math.random() < 0.09) {
                    type = 3;
                }

                const towerKey = this.key + `-${j}-${i}`;

                let tile = this.tileMap.get(`${j},${i}`);
                if(!tile){

                    const worldTileX = this.panelX * (PANEL_SIZE + PANEL_PADDING) + towerX * TILE_SIZE + TILE_SIZE / 2;
                    const worldTileY = this.panelY * (PANEL_SIZE + PANEL_PADDING) + towerY * TILE_SIZE + TILE_SIZE / 2;

                    const worldItemX = this.panelX * (PANEL_SIZE + PANEL_PADDING) + itemX * TILE_SIZE + TILE_SIZE / 2;
                    const worldItemY = this.panelY * (PANEL_SIZE + PANEL_PADDING) + itemY * TILE_SIZE + TILE_SIZE / 2;

                    if(isTower && !towerKeys.has(towerKey)){
                        this.tower = new Tower(worldTileX, worldTileY, towerKey);
                        towers.push(this.tower);
                        towerKeys.add(towerKey);
                    }

                    if(isItem && !itemKeys.has(towerKey)){
                        items.push(new Item(worldItemX, worldItemY, towerKey, type));
                        itemKeys.add(towerKey);
                    }


                    tile = new Tile(p, q, key, isColony, isTower, towerKey, isItem, type);
                    this.tileMap.set(`${j},${i}`, tile);

                }
                else {
                    tile.x = p;
                    tile.y = q;
                    tile.worldX = tile.x + camera.x;
                    tile.worldY = tile.y + camera.y;
                    tile.isColony = isColony && tile.health > 0;  // Preserve health state
                    if(tile.isHub){
                        if(tile.type === 2) tile.color = "#FFB8E0";
                        else if(tile.type === 3) tile.color = "#FFFA8D";
                        else if(tile.type === 1) {
                            const gradient = c.createLinearGradient(tile.x, tile.y, tile.x + TILE_SIZE, tile.y + TILE_SIZE);

                            gradient.addColorStop(0, "#252A34");
                            gradient.addColorStop(1, "#FF0B55");

                            tile.color = gradient;
                        }
                        else if(tile.type === 4) {
                            const gradient = c.createLinearGradient(tile.x, tile.y, tile.x + TILE_SIZE, tile.y + TILE_SIZE);

                            gradient.addColorStop(0, "#E0F9B5");
                            gradient.addColorStop(1, "#67AE6E");

                            tile.color = gradient;
                        }
                        else if(tile.type === -1) {
                            const gradient = c.createLinearGradient(tile.x, tile.y, tile.x + TILE_SIZE, tile.y + TILE_SIZE);

                            gradient.addColorStop(0, "#5409DA");
                            gradient.addColorStop(1, "#252A34");

                            tile.color = gradient;
                        }
                    }
                    else if(tile.isColony){
                        tile.color = "#252A34"
                    }
                    else{
                        tile.color = "#AED2FF";
                    }


                }

                tile.draw();
            }
        }
    }



}

class Tile{
    constructor(x, y, key, isColony, isTower, towerKey, hasItem, type) {
        this.x = x;
        this.y = y;
        this.worldX = x + camera.x;
        this.worldY = y + camera.y;
        // this.color = isColony ? "#252A34" : "#FFD1E3";
        this.key = key;
        this.isColony = isColony;
        this.hasTower = isTower;
        this.hasItem = hasItem;
        this.towerKey = towerKey;
        this.health = isColony ? 100 : 0;
        this.isDestroyed = false;
        this.isHub = false;
        this.center = false;
        this.itemType = type;
        this.type = 2;
        this.isMine = false;
        this.isTp = false;
        this.tpTo = null;

    }

    draw(){
        //🔰💻
        c.fillStyle = this.color;
        c.fillRect(this.x, this.y, TILE_SIZE, TILE_SIZE);

        c.lineWidth = 2;
        c.strokeStyle = "#ffffff";
        c.strokeRect(this.x, this.y, TILE_SIZE, TILE_SIZE);

        switch(this.type) {
            case 1:
                if (this.center) {
                    c.font = `${TILE_SIZE * 1.2}px serif`; // Adjust size as needed
                    c.textAlign = "center";
                    c.textBaseline = "middle";
                    c.fillStyle = "#000000";
                    c.fillText("🔰", this.x + TILE_SIZE / 2, this.y + TILE_SIZE / 2);
                }
                break;

            case 2:
                if (this.center) {
                    c.font = `${TILE_SIZE * this.size}px serif`; // Adjust size as needed
                    c.textAlign = "center";
                    c.textBaseline = "middle";
                    c.fillStyle = "#000000"; // Emoji color
                    c.fillText("🗃️", this.x + TILE_SIZE / 2, this.y + TILE_SIZE / 2);
                }
                break;

            case 3:
                if (this.center) {
                    c.font = `${TILE_SIZE * 1.1}px serif`; // Adjust size as needed
                    c.textAlign = "center";
                    c.textBaseline = "middle";
                    c.fillStyle = "#000000"; // Emoji color
                    c.fillText("🛍️", this.x + TILE_SIZE / 2, this.y + TILE_SIZE / 2);
                }
                break;
            case 6:
                c.font = `${TILE_SIZE * 0.8}px serif`; // Adjust size as needed
                c.textAlign = "center";
                c.textBaseline = "middle";
                c.fillStyle = "#000000"; // Emoji color
                c.fillText("📍", this.x + TILE_SIZE / 2, this.y + TILE_SIZE / 2);
                break;
            case 9:
                const centerX = this.x + TILE_SIZE / 2;
                const centerY = this.y + TILE_SIZE / 2;
                c.font = `${TILE_SIZE *0.9}px serif`; // Adjust size as needed
                c.textAlign = "center";
                c.textBaseline = "middle";
                c.fillStyle = "#000000"; // Emoji color
                c.fillText("🌀", centerX, centerY);

                c.font = `${TILE_SIZE * 0.7}px sans-serif`; // Smaller font for label
                c.fillStyle = "#FFFBE9"; // Label color
                c.fillText(this.tpNo, centerX, centerY); // Adjust spacing as needed

                break;

            case -1:
                if (this.center) {
                    c.font = `${TILE_SIZE * 1.1}px serif`; // Adjust size as needed
                    c.textAlign = "center";
                    c.textBaseline = "middle";
                    c.fillStyle = "#000000"; // Emoji color
                    c.fillText("⚔️", this.x + TILE_SIZE / 2, this.y + TILE_SIZE / 2);
                }
                break;
        }
    }

    destroy(){
        if(this.hasTower){
            const index = towers.findIndex(t => t.key === this.towerKey);
            if (index !== -1) {
                towers.splice(index, 1);
            }
            this.hasTower = false;

        }
        this.isColony = false;
        this.health = 0;
        this.color = "#AED2FF";
        this.isDestroyed = true;


    }

    collect(a=1){
        if(this.hasItem){
            const index = items.findIndex(t => t.key === this.towerKey);
            if (index !== -1) {
                this.hasItem = false;
                items.splice(index, 1);
                if(a === 0) return;
                switch(this.itemType){
                    case 1: keysCollected++;
                        SCORE += 10;
                        if(isALERT) ALERT = true;
                        break;

                    case 2: player.health = Math.min(player.maxHealth, player.health + 50);
                        break;

                    case 3: player.isInvisible = true;
                        setTimeout(() => {
                            player.isInvisible = false;
                        }, 7000);
                        break;

                    case 4:
                        shardsCollected++;
                        SCORE += 50;
                        break;
                }



            }
        }
    }

    deposit(){
        switch(this.type){
            case 1:
                ALERT = false;
                while(shardsCollected>0){
                    SCORE += 100;
                    shardsCollected--;
                    systemHealth += 10;
                    if(systemHealth >=100){

                    }
                }
                break;

            case 2:
                if(keysCollected >= 5) {
                    const mine = datamines.find(d => d.tile === this)
                    if(mine && !mine.isAnimating){
                        mine.startAnimation(performance.now());
                        keysCollected -= 5;
                    }
                }
                break;

            case 3:
                isOpen = true;
                break;
            case 4:
                ALERT = false;
                player.isSafe = true;
                break;
        }
    }
}

class Player{
    constructor(x, y) {
        this.worldX = x;
        this.worldY = y;
        this.health = 300;
        this.radius = TILE_SIZE/2 - 2;
        this.isInvisible = false;
        this.shieldHealth = 0;
        this.maxHealth = 300;
        this.isSafe = false;
    }
    draw(){
        if(!this.isInvisible) {
            c.fillStyle = "#FF2E63";
            c.beginPath();
            c.arc(this.worldX, this.worldY, this.radius, 0, 2 * Math.PI);
            c.fill();
        }
        else{
            c.strokeStyle = "#FF2E63";
            c.beginPath();
            c.arc(this.worldX, this.worldY, this.radius, 0, 2 * Math.PI);
            c.stroke();
        }
        // c.fillStyle = "#16f400";
        // c.fillRect(this.x - 25, this.y - this.radius - 20, 50 * (this.health / 100), 5);
        // c.strokeStyle = "white";
        // c.strokeRect(this.x - 25, this.y - this.radius - 20, 50, 5);
    }

    takeDamage(damage){
        if(!this.isSafe) {
            if(this.shieldHealth > 0){
                this.shieldHealth -= damage*0.5;
            }
            else{
                if(this.shieldHealth > 0) {
                    if (this.shieldHealth >= damage) {
                        this.shieldHealth -= damage;
                    } else if (this.shieldHealth < damage) {
                        player.health -= damage - this.shieldHealth;
                        this.shieldHealth = 0;
                    }
                }
                else{
                    if(this.health <= 0) gameOver = true;
                    else this.health -= damage;
                }
            }
        }
    }

    shoot(){
        const angle = Math.atan2(cursor.y - this.worldY, cursor.x - this.worldX);
        if(BULLET_RADIAL) {
            const STEP = 0.4 * Math.PI;
            for(let i = 0; i < Math.PI*2; i += STEP) {
                const bullet = new Bullet(player.worldX, player.worldY,angle + i, 1);
                bullets.push(bullet);
            }
        }
        else{
            const bullet = new Bullet(player.worldX, player.worldY, angle, 1);
            bullets.push(bullet);
        }
    }

}

class Tower{
    constructor(x, y, key) {
        this.worldX = x;
        this.worldY = y;
        this.key = key;
        this.color = "#5409DA";
        this.angle = Math.random() * 2 * Math.PI;
    }

    draw(){

        const x = this.worldX - camera.x;
        const y = this.worldY - camera.y;

        c.fillStyle = this.color;
        c.strokeStyle = this.color;


        c.save();
        c.globalAlpha = 0.5;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + Math.cos(this.angle - TOWER_DETECTION_ANGLE/2) * TOWER_DETECTION_RANGE, y + Math.sin(this.angle - TOWER_DETECTION_ANGLE/2) * TOWER_DETECTION_RANGE);
        c.arc(x, y, TOWER_DETECTION_RANGE, this.angle - TOWER_DETECTION_ANGLE/2, this.angle + TOWER_DETECTION_ANGLE/2, false);
        c.closePath();
        c.fill();
        c.restore();
        c.stroke();


    }

    update(){
        this.draw();

        const px = player.worldX + camera.x;
        const py = player.worldY + camera.y;

        const dx = px - this.worldX;
        const dy = py - this.worldY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= TOWER_DETECTION_RANGE + player.radius) {
            const angleToPlayer = Math.atan2(dy, dx);

            let relativeAngle = angleToPlayer - this.angle;
            relativeAngle = Math.atan2(Math.sin(relativeAngle), Math.cos(relativeAngle));

            if(Math.abs(relativeAngle) < TOWER_DETECTION_ANGLE / 2){
                player.takeDamage(TOWER_DAMAGE_RATE);
            }
        }

        this.angle += TOWER_ROTATION_SPEED;

    }
}

class Item{
    constructor(x, y, key, type) {
        this.worldX = x;
        this.worldY = y;
        this.key = key;
        this.color = "orange";
        this.angle = Math.random() * 2 * Math.PI;
        this.size = 24;
        this.type = type;
    }

    draw(){

        const x = this.worldX - camera.x;
        const y = this.worldY - camera.y;

        switch(this.type) {

            case 1:
                this.size = 12;
                c.save();

                c.fillStyle = "white"

                c.shadowColor = "deeppink";
                c.shadowBlur = 20;
                c.globalAlpha = 0.7;
                c.beginPath();
                c.moveTo(x, y - this.size);
                c.lineTo(x + this.size, y);
                c.lineTo(x, y + this.size);
                c.lineTo(x - this.size, y);
                c.closePath();
                c.fill();
                c.restore();
                c.lineWidth = 3;
                c.strokeStyle = "deeppink";
                c.stroke()
                break;

            case 2:
                c.save();
                c.translate(x, y);
                c.scale(this.size, this.size);
                c.shadowColor = "#FF2E63";
                c.shadowBlur = 20;
                c.beginPath();
                c.moveTo(0, -0.3);
                c.bezierCurveTo(-0.4, -0.75, -0.95, -0.05, 0, 0.5);
                c.bezierCurveTo(0.95, -0.05, 0.4, -0.75, 0, -0.3);
                c.closePath();
                c.fillStyle = "#FF2E63";
                c.fill();
                c.restore();
                c.lineWidth = 3;
                c.strokeStyle = "#252A34";
                c.stroke();
                break;

            case 3:

                this.size = 16;
                c.strokeStyle = "#FF2E63";
                c.lineWidth = 3;
                c.save();
                c.shadowColor = "#FF2E63";
                c.shadowBlur = 10;
                c.translate(x, y);
                c.beginPath();
                c.arc(0, 0, this.size, 0, Math.PI * 2);
                c.stroke();

                c.globalAlpha = 0.1;
                c.fillStyle = "white";
                c.beginPath();
                c.arc(0, 0, this.size * 0.7, 0, Math.PI * 2);
                c.fill();
                c.closePath();

                c.restore()
                break;

            case 4:
                this.size = 16;
                const r = this.size;

                c.save();
                c.fillStyle = "white"

                c.shadowColor = "deeppink";
                c.shadowBlur = 20;
                c.globalAlpha = 0.7;
                c.beginPath();
                // c.moveTo(x, y - this.size);
                // c.lineTo(x + this.size, y);
                // c.lineTo(x, y + this.size);
                // c.lineTo(x - this.size, y);

                for (let i = 0; i < 6; i++) {
                    const angle = Math.PI / 3 * i + Math.PI / 6; // 60° increments
                    const px = x + r * Math.cos(angle);
                    const py = y + r * Math.sin(angle);
                    if (i === 0) {
                        c.moveTo(px, py);
                    } else {
                        c.lineTo(px, py);
                    }
                }
                c.closePath();
                c.fill();
                c.restore();
                c.lineWidth = 6;
                c.strokeStyle = "yellow";
                c.stroke()
                break;
        }


    }

    update(){
        this.draw();
    }


}

class Bullet{
    constructor(x, y, angle, side,damage = BULLET_DAMAGE, radius=10, color="#FF2E63") {
        this.angle = angle;
        this.side = side;
        this.color = color;
        this.damage = damage;
        this.radius = radius;
        this.speed = 5.5;
        this.vx = this.speed * Math.cos(this.angle);
        this.vy = this.speed * Math.sin(this.angle);


        this.worldX = x + camera.x;
        this.worldY = y + camera.y;

        this.screenX = canvas.width/2;
        this.screenY = canvas.height/2;

    }

    draw(){
        c.fillStyle = this.color;

        c.beginPath();
        c.arc(this.screenX, this.screenY, this.radius, 0, 2 * Math.PI);
        c.closePath();
        c.fill();

    }

    update() {

        // Check for collisions before moving
        const canMoveX = this.canMove(1, this.vx);
        const canMoveY = this.canMove(2, this.vy);

        if(BULLET_BOUNCE) {
            if (!canMoveX) {
                this.vx *= -0.8; // Bounce with 80% energy retention
                this.damage -= 5;

            }
            if (!canMoveY) {
                this.vy *= -0.8; // Bounce with 80% energy retention
                this.damage -= 5;
            }
        }

        // Update position
        this.worldX += this.vx;
        this.worldY += this.vy;

        // Update screen position
        this.screenX = this.worldX - camera.x;
        this.screenY = this.worldY - camera.y;

        this.draw();
        this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }

    canMove(t, dt) {
        const radius = this.radius;
        const tiles = [];
        let mult = 1;

        // Use world coordinates for collision detection
        let x = this.screenX + camera.x;
        let y = this.screenY + camera.y;

        if (t === 1) { // Horizontal movement
            if (dt > 0) mult = -1;
            if (dt < 0) mult = 1;

            tiles.push(getTile(x - camera.x, y - camera.y, dt - radius * mult, 0));
            tiles.push(getTile(x - camera.x, y - camera.y, dt - radius * mult, radius));
            tiles.push(getTile(x - camera.x, y - camera.y, dt - radius * mult, -radius));
        }
        if (t === 2) { // Vertical movement
            if (dt > 0) mult = -1;
            if (dt < 0) mult = 1;

            tiles.push(getTile(x - camera.x, y - camera.y, 0, dt - radius * mult));
            tiles.push(getTile(x - camera.x, y - camera.y, -radius, dt - radius * mult));
            tiles.push(getTile(x - camera.x, y - camera.y, radius, dt - radius * mult));
        }

        for (let i = tiles.length - 1; i >= 0; i--) {
            const tile = tiles[i];
            if (tile && tile.isColony) {
                tile.health -= this.damage;
                if(tile.health <= 0){
                    tile.destroy();
                }
                return false;
            }
        }

        return true;
    }

    checkCollision() {
        if (this.side === 2) {

            const dx = this.screenX - player.worldX;
            const dy = this.screenY - player.worldY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if(distance <= this.radius + player.radius){
                console.log(this.damage);
                player.takeDamage(this.damage);
                return true;
            }
        }
        else if(this.side === 1) {
            for (const bot of bots) {
                const dx = this.worldX - bot.worldX;
                const dy = this.worldY - bot.worldY;

                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= this.radius + bot.radius) {
                    bot.takeDamage(this.damage);
                    return true;
                }
            }
        }
        return false;
    }
}

function generateColony(i, j){
    let rawSeed = (i*1000 + j+SEED)*SEED;
    const t = 233280;
    const seed = ((rawSeed % t) + t) % t;
    const rand = new SeededRandom(seed);

    const width = MIN_COLONY_SIZE + Math.floor(rand.next() * (MAX_COLONY_SIZE - MIN_COLONY_SIZE));
    const height = MIN_COLONY_SIZE + Math.floor(rand.next() * (MAX_COLONY_SIZE - MIN_COLONY_SIZE));

    const maxX = TILES_PER_PANEL - COLONY_MARGIN - width;
    const maxY = TILES_PER_PANEL - COLONY_MARGIN - height;

    const startX = COLONY_MARGIN + Math.floor(rand.next() * maxX);
    const startY = COLONY_MARGIN + Math.floor(rand.next() * maxY);

    return {startX, startY, width, height}

}

function placeHub(dx = 0, dy = 0, type) {

    // const c =  Math.ceil(canvas.width / (PANEL_SIZE + PANEL_PADDING));
    // const d =  Math.ceil(canvas.height / (PANEL_SIZE + PANEL_PADDING));

    let a = Math.floor(camera.x / (PANEL_SIZE + PANEL_PADDING));
    let b = Math.floor(camera.y / (PANEL_SIZE + PANEL_PADDING));

    if(dx === 1){
        a = Math.floor((camera.x + canvas.width) / (PANEL_SIZE + PANEL_PADDING));
    }
    else if(dx === -1){
        a -= 1;
    }
    if(dy === 1){
        b = Math.floor((camera.y + canvas.height) / (PANEL_SIZE + PANEL_PADDING));
    }
    else if(dy === -1){
        b -= 1;
    }


    const x = a * (PANEL_SIZE + PANEL_PADDING) - camera.x;
    const y = b * (PANEL_SIZE + PANEL_PADDING) - camera.y;


    const panelKey = `${a}-${b}`;
    let panel = panels.get(panelKey);

    if(seenPanels.has(panelKey)){
        return;
    }

    if(type !== -1) {
        const len = hubs.length;
        for (let i = 0; i < len; i++) {
            let hub = hubs[i];
            const distance = Math.sqrt(Math.pow(x + camera.x - hub.x, 2) + Math.pow(y + camera.y - hub.y, 2));
            if (distance < Math.max(canvas.width, canvas.height)) {
                return;
            }
        }
    }

    if (!panel) {
        panel = new Panel(x, y, a, b);
        panels.set(panelKey, panel);
        console.log("Couldn't place hub");
        return;
    }

    seenPanels.add(panelKey);
    const centerStartX = Math.floor(TILES_PER_PANEL / 2) - 1;
    const centerStartY = Math.floor(TILES_PER_PANEL / 2) - 1;
    const centerSize = 3;


    panel.tileMap.forEach(tile => {
        tile.destroy();
        tile.collect(0);

    })


    let mine = null;

    for(let i = centerStartX; i<centerStartX + centerSize; i++){
        for(let j = centerStartY; j<centerStartY + centerSize; j++){
            const key = `${i},${j}`;
            let tile = panel.tileMap.get(key);
            tile.isHub = true;
            tile.type = type;
            if(i === 2 && j === 2){
                tile.center = true;
                if(type === 2) mine = tile;
                if(type === -1) {
                    spawn.x = tile.x + TILE_SIZE / 2;
                    spawn.y = tile.y + TILE_SIZE / 2;
                }
                hub.x = x + camera.x;
                hub.y = y + camera.y;
                hubs.push({worldX: x + camera.x, worldY: y + camera.y});
            }

        }
    }

    if(mine) {
        const datamine = new Datamine(mine);
        datamines.push(datamine);
    }

    console.log("Placed Hub", type);
    if(type === 1){
        placedAurex = true;
    }
}

function generate(){

    const startX = Math.floor(camera.x / (PANEL_SIZE + PANEL_PADDING)) - 1;
    const startY = Math.floor(camera.y / (PANEL_SIZE + PANEL_PADDING)) - 1;
    const endX = startX + Math.ceil(canvas.width / (PANEL_SIZE + PANEL_PADDING)) + 2;
    const endY = startY + Math.ceil(canvas.height / (PANEL_SIZE + PANEL_PADDING)) + 2;


    for(let i = startX; i < endX; i++){
        for(let j = startY; j< endY; j++){

            const key = `${i}-${j}`;
            let panel = panels.get(key);

            if(i > 0 && i < startX + Math.ceil(canvas.width / (PANEL_SIZE + PANEL_PADDING))){
                seenPanels.add(key);}

            const x = i * (PANEL_SIZE + PANEL_PADDING) - camera.x;
            const y = j * (PANEL_SIZE + PANEL_PADDING) - camera.y;

            if(!panel) {
                panel = new Panel(x, y, i, j);
                panels.set(panel.key, panel);
            }
            else{
                panel.worldX = x;
                panel.worldY = y;
            }

            panel.draw();


        }
    }

}

function getTile(x, y, dx = 0, dy = 0) {
    const worldX = camera.x + x + dx;
    const worldY = camera.y + y + dy;

    const panelX = Math.floor(worldX / (PANEL_SIZE + PANEL_PADDING));
    const panelY = Math.floor(worldY / (PANEL_SIZE + PANEL_PADDING));

    const localX = worldX - panelX * (PANEL_SIZE + PANEL_PADDING);
    const localY = worldY - panelY * (PANEL_SIZE + PANEL_PADDING);

    const tileRegionStart = 0;
    const tileRegionSize = TILE_SIZE * TILES_PER_PANEL;

    if (localX >= tileRegionStart &&
        localX < tileRegionStart + tileRegionSize &&
        localY >= tileRegionStart &&
        localY < tileRegionStart + tileRegionSize) {

        const tileX = Math.floor(localX / TILE_SIZE);
        const tileY = Math.floor(localY / TILE_SIZE);

        const key = `${panelX}-${panelY}`;
        const panel = panels.get(key);

        if (panel && panel.tileMap) {
            return panel.tileMap.get(`${tileX},${tileY}`);
        }
    }

    return false;
}

function canMove(object, t, dt, a=0){
    const radius = object.radius;
    const tiles = [];
    let mult = 1;

    let x, y;
    if(object === player) {
        x = object.worldX;
        y = object.worldY;
    }
    else{
        x = object.worldX - camera.x;
        y = object.worldY - camera.y;
    }

    if(t === 1){
        if(dt > 0) mult = -1;
        if(dt < 0) mult = 1;

        tiles.push(getTile(x, y, dt - radius*mult, 0));
        tiles.push(getTile(x, y, dt - radius*mult, radius));
        tiles.push(getTile(x, y, dt - radius*mult, -radius));
    }
    if(t === 2){
        if(dt > 0) mult = -1;
        if(dt < 0) mult = 1;

        tiles.push(getTile(x, y, 0, dt - radius*mult));
        tiles.push(getTile(x, y, -radius, dt - radius*mult));
        tiles.push(getTile(x, y, radius, dt - radius*mult));
    }

    for(let i = tiles.length - 1; i >= 0; i--){
        const tile = tiles[i]
        if(tile) {
            if(a === 1 && object !== player) return false;
            if (tile.isColony) {
                return false;
            }
            if(object === player) {
                if (tile.hasItem) {
                    tile.collect();
                }
                if (tile.isHub) {
                    tile.deposit();
                }
                else {
                    teleportUIOpen = false;
                    isOpen = false;
                    hoveredItem = null;
                    player.isSafe = false;
                }
            }
            if (tile.type === 9 && teleports.length > 1 && canTeleport ){
                teleportUIOpen = true;
                showTeleports();
            }
        }
    }

    return true;
}

function move(destTile){

    // Get the center of the destination tile in WORLD coordinates
    const destCenterX = destTile.worldX + TILE_SIZE / 2;
    const destCenterY = destTile.worldY + TILE_SIZE / 2;

    camera.x = destCenterX - canvas.width / 2;
    camera.y = destCenterY - canvas.height / 2;

    player.worldX = canvas.width / 2;
    player.worldY = canvas.height / 2;
    canTeleport = false;

    teleportUIOpen = false;

    setTimeout(() => {
        canTeleport = true;
    }, 10000);
}

function showTeleports() {
    hoveredTp = null;

    c.save();

    c.fillStyle = 'rgba(0, 0, 0, 0.8)';
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.strokeStyle = "#4f5ffe"; //'#2BC1FF'
    c.lineWidth = 7;
    c.strokeRect(0, 0, canvas.width, canvas.height);

    // Draw title
    c.fillStyle = 'white';
    c.font = 'bold 36px "Segoe UI", sans-serif';
    c.textAlign = 'center';
    c.fillText('SELECT TELEPORT DESTINATION', canvas.width / 2, 65);


    // Draw TP options
    teleports.forEach((teleport, index) => {
        const yPos = canvas.height / 2 - teleports.length * 70 + index * 170;
        const tile = teleport.tile;

        const cardX = canvas.width / 2 - 400;
        const cardY = yPos - 60;
        const cardW = 820;
        const cardH = 140;
        const borderRadius = 15;

        // Check hover first
        const isHovered = (
            cursor.x >= cardX &&
            cursor.x <= cardX + cardW &&
            cursor.y >= cardY &&
            cursor.y <= cardY + cardH
        );

        if(isHovered) {
            hoveredTp = teleport;
        }

        c.save();
        c.fillStyle = isHovered
            ? 'rgba(25, 25, 35, 0.8)'   // Slightly lighter fill when hovered
            : 'rgba(0, 0, 0 ,0.75)';
        roundRect(c, cardX, cardY, cardW, cardH, borderRadius, true, false);
        c.restore();

        const iconX = cardX + 30;
        const iconY = yPos;
        c.fillStyle = isHovered
            ? 'rgba(255, 255, 255, 1)'
            : 'rgba(255, 255, 255, 0.85)';
        c.font = '80px sans-serif';
        c.textAlign = 'left';
        c.fillText('🌀', iconX, iconY + 10);

        c.font = 'bold 43px Alegreya Sans, sans-serif';
        c.fillText(`TP ${teleport.no}`, iconX + 120, iconY + 10);

        // Distance on the right
        const distance = Math.floor(Math.hypot(
            (player.worldX + camera.x) - (tile.worldX + TILE_SIZE / 2),
            (player.worldY + camera.y) - (tile.worldY + TILE_SIZE / 2)
        ));
        c.font = 'bold 28px "Segoe UI", sans-serif';
        c.textAlign = 'right';
        c.fillText(`${distance} units`, cardX + cardW - 30, iconY + 10);
    });
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof radius === 'undefined') radius = 5;
    if (typeof radius === 'number') {
        radius = { tl: radius, tr: radius, br: radius, bl: radius };
    } else {
        const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
        for (let side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

function showStats(){
    //2bc1ff

    //Background overlay
    c.fillStyle = "rgba(0, 0, 0, 0.7)";
    c.strokeStyle = "#2BC1FF";
    c.lineWidth = 3;
    c.beginPath();
    c.roundRect(10, 5, 300, 290, 20);
    c.fill();
    c.stroke();

    const distance = Math.floor(Math.sqrt(Math.pow(player.worldX + camera.x - spawn.x, 2) + Math.pow(player.worldY + camera.y - spawn.y, 2)));
    const distance2 = Math.floor(Math.sqrt(Math.pow(player.worldX + camera.x - mark.x, 2) + Math.pow(player.worldY + camera.y - mark.y, 2)));

    const textYPositions = [35, 65, 95, 125, 155, 185, 215, 245, 275];
    const stats = [
        `System Health: ${systemHealth}`,
        `Player Health: ${player.health.toFixed(2)}`,
        `Shield Health: ${player.shieldHealth.toFixed(2)}`,
        `Keys: ${keysCollected}`,
        `Shards Collected: ${shardsCollected}`,
        `Mark Distance: ${distance2}`,
        `Selected :${SELECTED}`,
        `Ammunition : ${EQUIPPED === 'pistol'?'♾️':EQUIPPED.ammo}`
    ];

    const iconColors = ["#FF2E63", "#2BC1FF", "#000000", "#FFD700", "cyan", "#A020F0", "Brown", "blue"];

    stats.forEach((stat, i) => {

        // Icon background
        c.fillStyle = iconColors[i];
        c.beginPath();
        c.arc(30, textYPositions[i] - 5, 10, 0, Math.PI * 2);
        c.fill();

        // White icon center
        c.fillStyle = "white";
        c.beginPath();
        c.arc(30, textYPositions[i] - 5, 5, 0, Math.PI * 2);
        c.fill();

        // Text
        const color = (i===1) && (player.isSafe) ? "#16f400": "white";
        const color2 = i===0 ? "rgb(255, 40, 90)" : color;
        c.fillStyle = i===3 && keysCollected >= 5 ? "yellow" : color2
        c.font = "26px 'Alegreya Sans', sans-serif";
        c.textAlign = "left";
        c.fillText(stat, 50, textYPositions[i]);
    });

    c.font = 'bold 24px "Segoe UI", sans-serif';
    // c.textAlign = 'center';

    c.lineWidth = 5;
    c.strokeStyle = "rgb(255, 190, 190)"
    c.strokeRect(canvas.width - 210, 20, 180, 50);
    c.fillStyle = "rgba(0, 0, 0, 0.5)"
    c.fillRect(canvas.width - 210, 20, 180, 50);
    c.fillStyle = "rgb(255, 190, 190)"
    c.fillText(`SCORE: ${SCORE}`, canvas.width - 200, 45);

    hoveredButton = (
        cursor.x >= canvas.width - 150 && cursor.x <= canvas.width - 30 &&
        cursor.y >= 90 && cursor.y <= 140
    )

    c.strokeStyle = "rgb(190, 190, 255)"
    c.strokeRect(canvas.width - 210, 90, 180, 50);
    c.fillStyle = hoveredButton ? "rgb(190, 190, 255)" : "rgba(0, 0, 0, 0.5)"
    c.fillRect(canvas.width - 210, 90, 180, 50);
    c.fillStyle = hoveredButton? "rgb(0, 0, 0)":"rgb(190, 190, 255)"
    c.font = 'bold 24px "Segoe UI", sans-serif';
    c.fillText(`RESET `, canvas.width - 155, 115);


    c.font = 'bold 60px "Segoe UI", sans-serif';
    c.textAlign = 'center';
    if(ALERT){
        c.fillStyle = 'red';
        c.fillText('ALL BOTS ON ALERT', canvas.width / 2, 65);
    }
    else if(isALERT){
        c.fillStyle = 'yellow';
        c.fillText('ALERT SYSTEM ACTIVATED', canvas.width / 2, 65);
    }

}

function drawBuyMenu() {

    c.font = "bold 60px Segoe UI";
    c.fillStyle = "white";
    c.fillText("MARKETPLACE", canvas.width/2, 50);

    hoveredItem = null;
    const drawColumn = (title, items, xOffset, color, highlight, textColor, height) => {
        const CELL_HEIGHT = height

        // Draw Title
        c.font = "bold 26px sans-serif";
        c.fillStyle = color;
        c.textAlign = "left";
        c.fillText(title, xOffset + 10, 140);
        let w = CELL_WIDTH - 40;
        const h = CELL_HEIGHT - 15;

        if(title === 'WEAPONS') {
            w = CELL_WIDTH;
        }

        // Draw Items
        c.font = "20px sans-serif";
        items.forEach((item, i) => {
            const x = xOffset;
            const y = 170 + i * CELL_HEIGHT;

            const isHovered = (
                cursor.x >= x && cursor.x <= x + w &&
                cursor.y >= y && cursor.y <= y + h);

            if (isHovered) {
                hoveredItem = item;

                c.save();
                c.strokeStyle = "white";
                c.lineWidth = 7;
                c.strokeRect(x - 2, y - 2, w + 4, h + 4);
                c.fillStyle = highlight;
                c.fillRect(x, y, w, h);
                c.restore();
            }

            const owned = item.owned;
            c.fillStyle = owned ? highlight : "rgba(0, 0, 0, 0.75)";
            // c.fillStyle = "rgba(0, 0, 0, 0.75)";
            c.fillRect(x, y, w, h);

            let imgSize = 200;
            let paddingY = 0;
            let paddingX = w/2 - CELL_WIDTH/5;


            if(item.name === 'light shield' || item.name === 'heavy shield') {
                imgSize *= 1.25;
                paddingY = 60;
                paddingX -= 50;
            }
            else {
                if (item.name === 'radial') {
                    imgSize *= 0.9;
                }
            }

            if(item.type === 'gun') {
                paddingY -= 10;
                paddingX += 20;
            }

            if(item.image)  c.drawImage(item.image, x + paddingX, y + paddingY, imgSize, imgSize);
            else{
                c.save();
                c.font = `${item.size}px serif`; // Adjust size as needed
                c.textAlign = "center";
                c.textBaseline = "middle";
                c.fillStyle = "#000000"; // Emoji color
                c.fillText(item.emoji, x + paddingX + 90,  y + paddingY + 110);
                c.restore();
            }


            c.lineWidth = 5;
            c.strokeStyle = color;
            c.strokeRect(x, y, w, h);

            c.textAlign = "left";
            c.fillStyle = "white";
            c.fillText(item.name.toUpperCase(), x + 10, y + 30);

            c.fillStyle = textColor;
            const costText = owned ? "OWNED" : `${item.cost} ${item.type === 'mine' ? 'KEYS' :"SHARDS" }`;
            // const costText = `${item.cost} SHARDS`;
            c.fillText(costText, x + 10, y + 60);
        });
    };

    // Column 1 - Enhancements
    drawColumn(
        "ENHANCEMENTS",
        ENHANCEMENTS,
        60,
        "#00ddff",
        "rgba(0, 120, 255, 0.35)",
        "#65e4f7", canvas.height/5
    );

    // Column 2 - Guns
    drawColumn(
        "WEAPONS",
        GUNS,
        120 + CELL_WIDTH,
        "#FF2E63",
        "rgba(255, 46, 99, 0.35)",
        "#FFB8E0", canvas.height/6
    );

    // Column 3 - Shields
    drawColumn(
        "SHIELDS",
        SHIELDS,
        220 + 2 * CELL_WIDTH,
        "#14C38E",
        "rgba(20, 195, 142, 0.35)",
        "#00FFAB", canvas.height/3
    );

    drawColumn(
        "TELEPORTS & MINES",
        OTHER,
        320 + 3 * CELL_WIDTH,
        "#b246fa",
        "rgba(84, 9, 218, 0.35)",
        "#D9B3FF", canvas.height/5
    );


}

function openMarket(){
    if(!isOpen) return;

    const pulseRadius = canvas.width * 0.6 - 4;
    c.fillStyle = "rgba(0, 0, 0, 0.7)";
    c.fillRect(0, 0, canvas.width, canvas.height);
    const bgGradient = c.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        pulseRadius * 0.2,
        canvas.width / 2,
        canvas.height / 2,
        pulseRadius
    );
    bgGradient.addColorStop(0, 'rgba(40, 40, 50, 0.15)');
    bgGradient.addColorStop(1, 'rgba(10, 10, 20, 0.85)');
    c.fillStyle = bgGradient;
    c.fillRect(0, 0, canvas.width, canvas.height);


    c.strokeStyle = "#fcdf03";
    c.lineWidth = 7;
    c.strokeRect(0, 0, canvas.width, canvas.height);

    drawBuyMenu();

}

function equip(name){

    const gun = GUNS.find(g => g.name === name);
    if(!gun){
        console.log("Gun not found.");
        return;
    }
    gun.owned = true;
    shardsCollected -= gun.cost;

    FIRE_RATE = gun.rate;
    camera.speed = gun.speed;
    BULLET_BOUNCE = gun.bounce;
    BULLET_DAMAGE = gun.damage;
    BULLET_RADIAL = gun.radial;

    EQUIPPED = gun;

    // if(timeOut){
    //     clearTimeout(timeOut);
    // }
    //
    // timeOut = setTimeout(() => {
    //
    //     GUNS.forEach(g => {
    //         g.owned = false;
    //     });
    //     equip('pistol');
    //
    // }, 15000)

}

function enhance(name){
    const skill = ALL_SKILLS.find(s => s.name === name);
    if(!skill){
        console.log("Skill not found.");
        return;
    }

    skill.owned = true;
    shardsCollected -= skill.cost;

    switch(skill.name){
        case "speed":
            camera.speed++;
            break;
        case "rate":
            FIRE_RATE -= 75;
            break;
        case "health":
            player.maxHealth += 100;
            player.health = Math.min(player.maxHealth, player.health + 50);
            break;
        case "light shield":
            player.shieldHealth += 50;
            break;
        case "heavy shield":
            player.shieldHealth += 100;
            break;
    }
}

class Bot{
    constructor(type){
        this.worldX = spawn.x;
        this.worldY = spawn.y;
        this.type = type;

        this.radius = 15;

        if(type === 1){
            this.speed = 4;
            this.health = 50;
            this.detectionRange = 500;
            this.attackRange = 400;
            this.color2 = "#08D9D6"
            this.damage = 15/2;
            this.attackRate = 1000;
            this.bulletRadius = 8;
        }

        if(type === 2){
            this.speed = 2.5;
            this.health = 150;
            this.attackRange = 400;
            this.detectionRange = 500;
            this.color2 = "rgb(0, 150, 255)";
            this.damage = 50/2;
            this.attackRate = 3000;
            this.bulletRadius = 10;
            this.radius = 18;
        }
        if(type === 3){
            this.speed = 2;
            this.health = 250;
            this.attackRange = 750;
            this.detectionRange = 800;
            this.color2 = "#5409DA";
            this.damage = 100/2;
            this.attackRate = 4000;
            this.bulletRadius = 12;
            this.radius = 20;
        }

        this.scale = 0.5;
        this.worldX += 2*(TILE_SIZE + this.radius+ 3);
        this.attackCooldown = 0;
        this.patrolSpeed = this.speed*0.5;
        this.directions = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 1, y: -1 },
            { x: 1, y: 1 },
            { x: -1, y: -1},
            { x: -1, y: 1}
        ];

        this.currentDirection = Math.floor(Math.random() * 8);
        console.log(this.currentDirection)
        this.changeDirectionInterval = 400;
        this.changeDirectionCounter = 0;

        this.maxAttempts = 40;
        this.attempts = 0;
    }

    draw(){
        this.screenX = this.worldX - camera.x;
        this.screenY = this.worldY - camera.y;

        //BOT
        c.fillStyle = this.color;

        c.beginPath();
        c.arc(this.screenX, this.screenY, this.radius,0, 2*Math.PI);
        c.fill();

        c.closePath();
        c.fillStyle = this.color2;
        c.beginPath();
        c.arc(this.screenX, this.screenY, this.radius-7,0, 2*Math.PI);
        c.fill();
        c.closePath();
        // c.beginPath();
        // c.fillStyle = this.color;
        // c.arc(this.screenX, this.screenY, this.radius - 15,0, 2*Math.PI);
        // c.fill();
        // c.closePath();

        // //BOT ATTACK RANGE
        // c.strokeStyle = "red";
        // c.save();
        // c.globalAlpha = 0.03;
        // c.beginPath();
        // c.arc(this.screenX, this.screenY, this.attackRange,0, 2*Math.PI);
        // c.fillStyle = "red";
        // c.fill();
        // c.restore();
        // c.stroke();
        // c.closePath();
        //
        // //BOT DETECTION RANGE
        // c.strokeStyle = "purple";
        // c.save();
        // c.globalAlpha = 0.03;
        // c.beginPath();
        // c.arc(this.screenX, this.screenY, this.detectionRange,0, 2*Math.PI);
        // c.fillStyle = "lightblue";
        // c.fill();
        // c.restore();
        // c.stroke();
        // c.closePath();



    }

    shoot(){
        const angle = Math.atan2(canvas.height/2 - this.screenY,  canvas.width/2 - this.screenX);
        const bullet = new Bullet(this.screenX, this.screenY, angle, 2, this.damage, this.bulletRadius, this.color2);
        bullets.push(bullet);
        bullets.push(bullet);
        this.attackCooldown = this.attackRate;
    }

    getRandomTurn(){
        return Math.floor(Math.random() * 8);
    }

    patrol(){

        // const screenX = this.worldX - camera.x;
        // const screenY = this.worldY - camera.y;
        // const currentTile = getTile(screenX, screenY);
        // if(currentTile){
        //     this.exitTile();
        //     return;
        // }
        this.changeDirectionCounter++;

        // Only consider changing direction at intervals
        if (this.changeDirectionCounter >= this.changeDirectionInterval) {
            this.changeDirectionCounter = 0;
            this.currentDirection = this.getRandomTurn();
        }

        const dir = this.directions[this.currentDirection];
        const moveX = dir.x * this.patrolSpeed;
        const moveY = dir.y * this.patrolSpeed;

        const canMoveX = dir.x !== 0 && canMove(this, 1, moveX, 1);
        const canMoveY = dir.y !== 0 && canMove(this, 2, moveY, 1);

        if (canMoveX || canMoveY) {
            if (canMoveX) this.worldX += moveX;
            if (canMoveY) this.worldY += moveY;
        }
        else {
            this.currentDirection = this.getRandomTurn();
        }
        this.attempts = 0;
    }

    update(){
        const dx = player.worldX + camera.x - this.worldX;
        const dy = player.worldY + camera.y - this.worldY;

        const angle = Math.atan2(dy, dx);

        const distance = Math.sqrt(dx * dx + dy * dy);
        this.attackCooldown -= 16
        if(!player.isInvisible && !player.isSafe && this.attackCooldown <0 &&  distance < this.attackRange){
            // this.color = "#ff0000";
            this.shoot();
        }
        else if(!player.isInvisible && !player.isSafe && (ALERT || distance < this.detectionRange)){
            this.color = "#252A34";
            const canMoveX = canMove(this, 1, Math.cos(angle)*this.speed, 1);
            const canMoveY = canMove(this, 2, Math.sin(angle)*this.speed, 1);

            if(canMoveX || canMoveY) {
                if (canMoveX) this.worldX += Math.cos(angle) * this.speed;
                if (canMoveY) this.worldY += Math.sin(angle) * this.speed;
            }
            else{


            }
        }
        else{
            this.color = "#ffffff";
            this.patrol();
        }
        this.draw();
    }

    takeDamage(damage){
        this.health -= damage;
        if(this.health <= 0){
            const i = bots.indexOf(this);
            bots.splice(i, 1);
        }
    }
}

class Datamine{
    constructor(tile, time=5, size=1.1) {
        this.tile = tile;
        this.tile.destroy();
        this.tile.isHub = true;
        this.tile.type = 2;
        this.tile.size = size;
        this.tile.center = true;
        this.time = time;
        this.animationId = null;
        this.startTime = null;
        this.clockRadius = 10;
        this.isAnimating = false;
        this.maxRadius = 150;
    }

    startAnimation(timestamp) {
        if(this.isAnimating) return;
        this.startTime = timestamp;
        this.isAnimating = true;
        this.animationId = requestAnimationFrame((ts) => this.animateClock(ts));
    }

    animateClock(timestamp) {

        if (!this.startTime) this.startTime = timestamp;
        const elapsed = (timestamp - this.startTime) / 1000;

        const x = this.tile.worldX + TILE_SIZE / 2 - camera.x;
        const y = this.tile.worldY + TILE_SIZE / 2 - camera.y;

        if (elapsed > this.time) {
            // shardsCollected++;
            this.clockRadius = 10;
            this.isAnimating = false;

            this.tile.itemType = 4;
            this.tile.hasItem = true;


            const itemKey = `shard-${Date.now()}`;
            items.push(new Item(this.tile.worldX, this.tile.worldY, itemKey, 4));
            itemKeys.add(itemKey);

            this.tile.towerKey = itemKey;

            this.stopAnimation();
            return;
        }

        if (this.clockRadius < this.maxRadius) {
            this.clockRadius += 1.5;
        }

        c.lineWidth = 5;
        c.beginPath();
        c.arc(x, y, this.clockRadius - 4, 0, 2 * Math.PI);
        c.strokeStyle = '#ffffff';
        c.stroke();
        c.closePath();

        c.fillStyle = "rgba(0, 0, 0, 0.6)"
        c.lineWidth = 7;
        c.beginPath();
        c.arc(x, y, this.clockRadius, 0, 2 * Math.PI);
        c.strokeStyle = '#129990';
        c.stroke();
        c.fill();
        c.closePath();

        c.lineWidth = 3;
        c.beginPath();
        c.arc(x, y, this.clockRadius + 4, 0, 2 * Math.PI);
        c.strokeStyle = '#ffffff';
        c.stroke();
        c.closePath();

        c.save();
        c.strokeStyle = "#129990";
        c.translate(x, y)
        for (let i = 0; i < 4; i++) {
            c.beginPath();
            c.rotate(Math.PI / 2);
            c.moveTo(this.clockRadius - 40, 0);
            c.lineTo(this.clockRadius - 20, 0);
            c.stroke();
        }
        c.restore();

        const angle = -Math.PI / 2 + (2 * Math.PI * elapsed) / this.time;

        c.save();
        c.translate(x, y);
        c.rotate(angle);
        c.strokeStyle = "white";
        c.fillStyle = "white";
        c.lineWidth = 6;

        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(this.clockRadius - 50, 0);
        c.fill();
        c.stroke();
        c.closePath();

        c.restore();

        if (this.isAnimating) {
            this.animationId = window.requestAnimationFrame((timestamp) => this.animateClock(timestamp));
        }
    }

    stopAnimation() {
        this.isAnimating = false;
        this.startTime = null;
        if(this.animationId) {
            window.cancelAnimationFrame(this.animationId);
        }

    }

}

function showInventory(){
    if(!inventoryOpen) return;

    c.textAlign = "left";
    c.save();
    c.fillStyle = "rgba(0, 0, 0, 0.7)";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.restore();

    c.save();
    c.fillStyle = bgGradient;
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.strokeStyle = "#FF2E63"; //'#2BC1FF'
    c.lineWidth = 7;
    c.strokeRect(0, 0, canvas.width, canvas.height);
    c.restore();

    c.font = "bold 60px Segoe UI";
    c.fillStyle = "white";
    c.fillText("INVENTORY", canvas.width/2 - 150, 50);

    // const COLUMN_WIDTH = 300;
    // const ITEM_HEIGHT = 80;
    // const PADDING = 20;
    // const START_Y = 120;

    hoveredItem = null;
    const drawColumn = (title, items, xOffset, color, highlight, textColor, height) => {
        const CELL_HEIGHT = height

        // Draw Title
        c.font = "bold 26px sans-serif";
        c.fillStyle = color;
        c.fillText(title, xOffset + 10, 140);
        let w = 2*CELL_WIDTH;
        const h = CELL_HEIGHT - 15;



        // Draw Items
        c.font = "30px Alegreya Sans,sans-serif";

        const ownedItems = items.filter(item => item.owned);
        ownedItems.forEach((item, i) => {
            const x = xOffset;
            const y = 170 + i * CELL_HEIGHT;

            const isHovered = (
                cursor.x >= x && cursor.x <= x + w &&
                cursor.y >= y && cursor.y <= y + h);

            if (isHovered) {
                hoveredItem = item;

                c.save();
                c.strokeStyle = "white";
                c.lineWidth = 7;
                c.strokeRect(x - 2, y - 2, w + 4, h + 4);
                c.fillStyle = highlight;
                c.fillRect(x, y, w, h);
                c.restore();
            }

            c.fillStyle = "rgba(0, 0, 0, 0.75)"
            if(item.type !== 'gun' && SELECTED === item.name) {
                c.fillStyle = highlight
            }
            else{
                if(EQUIPPED.name === item.name || EQUIPPED === item.name) {
                    c.fillStyle = highlight
                }
            }
            c.fillRect(x, y, w, h);

            c.lineWidth = 5;
            c.strokeStyle = color;
            c.strokeRect(x, y, w, h);

            c.fillStyle = "white";
            c.fillText(item.name.toUpperCase(), x + 10, y + 30);


            c.fillStyle = textColor;
            // const costText = owned ? "OWNED" : `${item.cost} SHARDS`;
            if(item.type === 'gun') {
                const costText = `${item.ammo} bullets`;
                c.fillText(costText, x + 10, y + 80);
            }
            else{
                const costText = `${item.count} units`;
                c.fillText(costText, x + 10, y + 80);
            }
        });
    };


    // Column 2 - Guns
    drawColumn(
        "WEAPONS",
        GUNS,
        60,
        "#FF2E63",
        "rgba(255, 46, 99, 0.35)",
        "#FFB8E0", canvas.height/6
    );


    drawColumn(
        "TELEPORTS & MINES",
        OTHER,
        220 + 2*CELL_WIDTH,
        "#b246fa",
        "rgba(84, 9, 218, 0.35)",
        "#D9B3FF", canvas.height/5
    );

}

let a = 0.1;
let isALERT = false;

function gameOverUI2(){
    paused = true;

    c.save();
    c.fillStyle = "rgba(0, 0, 0, 0.8)";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.restore();

    c.save();
    c.strokeStyle = "#16f400"; //'#2BC1FF'
    c.lineWidth = 7;
    c.strokeRect(0, 0, canvas.width, canvas.height);
    c.restore();

    c.font = "bold 80px Segoe UI";
    c.fillStyle = "white";
    c.fillText("GAME OVER", canvas.width/2, 70);

    const temp = 250
    const textYPositions = [35, 65, 95, 125, 155, 185, 215, 245, 275];
    const stats = [
        `SYSTEM HEALTH: ${systemHealth}`,
        `PLAYER HEALTH: ${player.health.toFixed(2)}`,
        `SHIELD HEALTH: ${player.shieldHealth.toFixed(2)}`,
        `KEYS: ${keysCollected}`,
        `SHARDS COLLECTED: ${shardsCollected}`,

    ];

    const iconColors = ["#FF2E63", "#2BC1FF", "#000000", "#FFD700", "cyan", "#A020F0", "Brown", "blue"];

    stats.forEach((stat, i) => {

        // Icon background
        // c.fillStyle = iconColors[i];
        // c.beginPath();
        // c.arc(30, textYPositions[i] - 5, 10, 0, Math.PI * 2);
        // c.fill();
        //
        // // White icon center
        // c.fillStyle = "white";
        // c.beginPath();
        // c.arc(30, textYPositions[i] - 5, 5, 0, Math.PI * 2);
        // c.fill();

        // Text

        c.fillStyle = "white"
        c.font = "50px 'Alegreya Sans', sans-serif";
        c.textAlign = "left";
        c.fillText(stat, canvas.width/2 - 250, temp + i*30 + textYPositions[i]);
    });
}

function gameOverUI() {
    paused = true;

    // Dim background overlay
    c.save();
    c.fillStyle = "rgba(0, 0, 0, 0.85)";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.restore();

    // Glowing border
    c.save();
    c.strokeStyle = "#3F72AF";
    c.lineWidth = 8;
    c.shadowColor = "#3F72AF";
    c.shadowBlur = 20;
    c.strokeRect(0, 0, canvas.width, canvas.height);
    c.restore();

    // GAME OVER Title
    c.save();
    c.font = "bold 90px 'Segoe UI', sans-serif";
    c.fillStyle = "white"
    c.textAlign = "center";
    c.shadowColor = "#000000";
    c.shadowBlur = 10;
    c.fillText("GAME OVER", canvas.width / 2, 100);
    c.restore();

    // Statistics
    const stats = [
        [`SCORE`, SCORE],
        [`SYSTEM HEALTH`, systemHealth],
        [`PLAYER HEALTH`, player.health.toFixed(2)],
        [`SHIELD HEALTH`, player.shieldHealth.toFixed(2)],
        [`KEYS`, keysCollected],
        [`SHARDS COLLECTED`, shardsCollected],
    ];

    const panelWidth = 800;
    const panelHeight = stats.length * 60 + 150;
    const panelX = canvas.width / 2 - panelWidth / 2;
    const panelY = 250;

    // Panel background
    c.save();
    c.fillStyle = "rgba(255, 255, 255, 0.05)";
    c.strokeStyle = "rgba(255, 255, 255, 0.2)";
    c.lineWidth = 2;
    c.shadowColor = "#3F72AF";
    c.shadowBlur = 8;
    c.fillRect(panelX, panelY, panelWidth, panelHeight);
    c.strokeRect(panelX, panelY, panelWidth, panelHeight);
    c.restore();

    // Stats text
    const labelX = panelX + 40;
    const valueX = panelX + panelWidth - 40;
    const startY = panelY + 50;
    const lineHeight = 80;

    c.save();
    c.font = "600 30px 'Segoe UI', sans-serif";
    c.fillStyle = "#ffffff";
    c.textAlign = "left";
    c.shadowColor = "rgba(0, 0, 0, 0.5)";
    c.shadowBlur = 4;

    stats.forEach(([label, value], i) => {
        const y = startY + i * lineHeight;
        c.font = "bold 36px 'Segoe UI', sans-serif";
        c.fillText(label, labelX, y);

        c.textAlign = "right";
        c.font = "bold 32px 'Segoe UI', sans-serif";
        c.fillStyle = "#0065F8";
        c.fillText(value, valueX, y);

        c.textAlign = "left";
        c.font = "600 30px 'Segoe UI', sans-serif";
        c.fillStyle = "#ffffff";
    });
    c.restore();

    // Footer prompt (optional)
    c.save();
    c.font = "italic 28px 'Segoe UI', sans-serif";
    c.fillStyle = "rgba(255, 255, 255, 0.7)";
    c.textAlign = "center";
    c.fillText("Press R to Restart", canvas.width / 2, canvas.height - 80);
    c.restore();
}

function animate(){
    requestAnimationFrame(animate);
    c.clearRect(0, 0, canvas.width, canvas.height);


    if(!paused) {
        if (keys.w) {
            if (dy < camera.speed) dy += acceleration;
            else dy = camera.speed;

            if (canMove(player, 2, -dy)) camera.y -= dy;
            else dy = 0.1;
        }
        if (keys.a) {
            if (dx < camera.speed) dx += acceleration;
            else dx = camera.speed;

            if (canMove(player, 1, -dx)) camera.x -= dx;
            else dx = 0.1;
        }
        if (keys.s) {
            if (dy < camera.speed) dy += acceleration;
            else dy = camera.speed;

            if (canMove(player, 2, dy)) camera.y += dy;
            else dy = 0.1;
        }
        if (keys.d) {
            if (dx < camera.speed) dx += acceleration;
            else dx = camera.speed;

            if (canMove(player, 1, dx)) camera.x += dx;
            else dx = 0.1;
        }
    }

    if(!placedAurex){
        placeHub(0, 0, 1);
        placeHub(1, 1, -1);
        console.log(spawn)
        bots.push(new Bot(1));
    }

    let type = 4;
    if(Math.random() < 0.4){
        type = 2;
        if(Math.random() < 0.5){
            type = 3;
        }
    }

    generate();
    if(camera.x > lastCamera.x + canvas.width){
        placeHub(1, 0, type);
        lastCamera.x = camera.x;
    }
    if(camera.x + canvas.width < lastCamera.x){
        placeHub(-1, 0, type);
        lastCamera.x = camera.x;
    }
    if(camera.y > lastCamera.y + canvas.height){
        placeHub(0, 1, type);
        lastCamera.y = camera.y;
    }
    if(camera.y + canvas.height < lastCamera.y){
        placeHub(0, -1, type);
        lastCamera.y = camera.y;
    }

    if(!paused) towers.forEach(tower => tower.update());
    else towers.forEach(tower => tower.draw());
    items.forEach(item => item.update());

    player.draw();
    for (let i = bots.length - 1; i >= 0; i--) {
        const bot = bots[i];
        if(!paused) bot.update();
        else bot.draw();
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        if (bullet.speed < 3.5) {
            bullets.splice(i, 1);
            continue;
        }

        if( !paused ) bullet.update();
        else bullet.draw();
        if(bullet.checkCollision()){
            bullets.splice(i, 1);
        }
    }

    showStats();
    if(isOpen) openMarket();

    if(teleportUIOpen) showTeleports();

    if(inventoryOpen) showInventory();

    if(gameOver) gameOverUI();

}

const player = new Player(canvas.width/2, canvas.height/2);
player.draw();

setInterval(() => {
    if(!paused){
        let type = 1;
        if (Math.random() < 0.5) {
            type = Math.floor(Math.random() * 2) + 2;
        }
        bots.push(new Bot(type));
    }
}, spawnRate)

setInterval(() => {
    if(!paused){
        systemHealth--;
        SCORE -= 5;
        if (systemHealth >= 75) {
            spawnRate = 5000;
            isALERT = true;
        }
        if (systemHealth >= 90) {
            spawnRate = 1000;
            SCORE += 2000;
        }
        if(systemHealth >= 100){
            gameOver = true;
            SCORE += 3000;
        }
        else isALERT = false;
    }
}, 5000)

generate();
requestAnimationFrame(animate);
