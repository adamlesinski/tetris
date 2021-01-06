window.onload = () => {
    setup();
    window.requestAnimationFrame(render);
};

const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;

const SHAPES = {
    'J': [{x: -1, y: -1}, {x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0}],
    'L': [{x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0}, {x: -1, y: 1}],
    'I': [{x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}],
    'S': [{x: 0, y: 0}, {x: 1, y: 0}, {x: -1, y: 1}, {x: 0, y: 1}],
    'Z': [{x: -1, y: 0}, {x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}],
    'T': [{x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}]  
};
const COLORS = ['red', 'green', 'yellow', 'blue', 'purple'];

var ctx;
var grid;
var highestBlockY;
var droppingPiece;

function setup() {
    const canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    grid = Array.from({length: GRID_WIDTH * GRID_HEIGHT}).fill(0);
    droppingPiece = newPiece();
    highestBlockY = GRID_HEIGHT;

    window.setInterval(() => {
        if (isPieceResting()) {
            commitPieceToGrid();
            droppingPiece = newPiece();
        } else {
            droppingPiece.position.y += 1;
        }
        window.requestAnimationFrame(render);
    }, 1000);

    window.addEventListener('keydown', event => {
        switch (event.keyCode) {
            case 37:
                // Left
                event.preventDefault();
                if (checkMovement(-1)) {
                    droppingPiece.position.x -= 1;
                    window.requestAnimationFrame(render);
                }
                break;
            case 38:
                // Up
                event.preventDefault();
                if (rotate(droppingPiece, -1)) {
                    window.requestAnimationFrame(render);
                }
                break;
            case 39:
                // Right
                event.preventDefault();
                if (checkMovement(1)) {
                    droppingPiece.position.x += 1;
                    window.requestAnimationFrame(render);
                }
                break;
            case 40:
                // Down
                event.preventDefault();
                if (isPieceResting()) {
                    commitPieceToGrid();
                    droppingPiece = newPiece();
                } else {
                    droppingPiece.position.y += 1;
                }
                window.requestAnimationFrame(render);
                break;
            case 32:
                // Space
                event.preventDefault();
                while (!isPieceResting()) {
                    droppingPiece.position.y += 1;
                }
                commitPieceToGrid();
                droppingPiece = newPiece();
                window.requestAnimationFrame(render);
                break;
        }
    });
}

function lookupGrid(x, y) {
    return grid[(y * GRID_WIDTH) + x];
}

function setGrid(x, y, cell) {
    grid[(y * GRID_WIDTH) + x] = cell;
}

function checkMovement(dir) {
    for (coord of droppingPiece.data) {
        const x = coord.x + droppingPiece.position.x + dir;
        const y = coord.y + droppingPiece.position.y;
        if (x < 0 || x >= GRID_WIDTH || lookupGrid(x, y) != 0) {
            return false;
        }
    }
    return true;
}

function rotate(shape, dir) {
    for (let i = 0; i < shape.data.length; i += 1) {
        const coord = shape.data[i];
        const x = ((-dir) * coord.y) + shape.position.x;
        const y = (dir * coord.x) + shape.position.y;
        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT || lookupGrid(x, y) != 0) {
            return false;
        }
    }

    for (let i = 0; i < shape.data.length; i += 1) {
        let coord = shape.data[i];
        const x = (-dir) * coord.y;
        const y = dir * coord.x;
        coord.x = x;
        coord.y = y;
    }
    return true;
}

function newPiece() {
    const keys = Object.keys(SHAPES);
    const shapeName = keys[Math.floor(Math.random() * keys.length)];
    let shape = {
        color: Math.floor(Math.random() * COLORS.length) + 1,
        position: {x: Math.floor(GRID_WIDTH / 2), y: 3},
        data: SHAPES[shapeName].map(coord => { return {x: coord.x, y: coord.y}; }),
    };
    const rotations = Math.floor(Math.random() * 4);
    for (let i = 0; i < rotations; i += 1) {
        rotate(shape, 1);
    }
    return shape;
}

function isPieceResting() {
    for (coord of droppingPiece.data) {
        const x = coord.x + droppingPiece.position.x;
        const y = coord.y + droppingPiece.position.y + 1;
        if (y >= GRID_HEIGHT || lookupGrid(x, y) != 0) {
            return true;
        }
    }
    return false;
}

function commitPieceToGrid() {
    let minY = GRID_HEIGHT;
    let maxY = -1;
    for (coord of droppingPiece.data) {
        const x = coord.x + droppingPiece.position.x;
        const y = coord.y + droppingPiece.position.y;
        setGrid(x, y, droppingPiece.color);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }

    highestBlockY = Math.min(highestBlockY, minY);

    // Check for complete rows
    let completedLines = [];
    for (let y = minY; y <= maxY; y += 1) {
        let complete = true;
        for (let x = 0; x < GRID_WIDTH; x += 1) {
            if (lookupGrid(x, y) == 0) {
                complete = false;
                break;
            }
        }

        if (complete) {
            completedLines.push(y);
        }
    }

    if (completedLines.length > 0) {
        // Clear the completed lines
        let completedLine = completedLines.pop();
        let wy = completedLine;
        let ry = completedLine;
        while (wy >= highestBlockY) {
            if (ry === completedLine) {
                // Move the read pointer up a row to skip this line.
                ry -= 1;
                completedLine = completedLines.pop();
            } else {
                // Copy the read row to the write row.
                if (ry < 0) {
                    grid.fill(0, wy * GRID_WIDTH, (wy + 1) * GRID_WIDTH);
                } else {
                    grid.copyWithin(wy * GRID_WIDTH, ry * GRID_WIDTH, (ry + 1) * GRID_WIDTH);
                }
                wy -= 1;
                ry -= 1;
            }
        }
    }
}

function render() {
    const CELL_WIDTH = ctx.canvas.width / GRID_WIDTH;
    const CELL_HEIGHT = ctx.canvas.height / GRID_HEIGHT;
    
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    ctx.fillStyle = COLORS[droppingPiece.color - 1];
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (coord of droppingPiece.data) {
        const x = (droppingPiece.position.x + coord.x) * CELL_WIDTH;
        const y = (droppingPiece.position.y + coord.y) * CELL_HEIGHT;
        ctx.rect(x, y, CELL_WIDTH, CELL_HEIGHT);
    }
    ctx.fill();
    ctx.stroke();

    for (let y = 0; y < GRID_HEIGHT; y += 1) {
        for (let x = 0; x < GRID_WIDTH; x += 1) {
            const cell = lookupGrid(x, y);
            if (cell != 0) {
                ctx.beginPath();
                ctx.fillStyle = COLORS[cell - 1];
                ctx.rect(x * CELL_WIDTH, y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
                ctx.fill();
                ctx.stroke();
            }
        }
    }
}