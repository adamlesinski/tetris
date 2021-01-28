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

const COLORS = ['#0FEBE3', '#05B6C5', '#F43086', '#FF89B4'];

var game = null;
var ctx = null;
var nextCtx = null;
var shadowCtx = null;
var nextShadowCtx = null;
var gameOverScreen = null;

class Game {
    constructor() {
        this._grid = Array.from({length: GRID_WIDTH * GRID_HEIGHT}).fill(0);
        this._clearedLines = 0;
        this._score = 0;
        this._droppingPiece = newPiece();
        this._nextPiece = newPiece();
        this._highestBlockY = GRID_HEIGHT;
        this._gameOver = false;
        this._timeoutId = null;

        this.tick = this.tick.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.render = this.render.bind(this);

        this._updateScores();
        window.addEventListener('keydown', this.handleInput);
        window.requestAnimationFrame(this.render);

        this._scheduleTick();
    }

    tick() {
        this._timeoutId = null;
        if (this._isPieceResting(this._droppingPiece)) {
            this._commitAndSetupNewPiece();
        } else {
            this._droppingPiece.position.y += 1;
        }
        window.requestAnimationFrame(this.render);
        this._scheduleTick();
    }

    _scheduleTick() {
        if (this._gameOver) {
            return;
        }
        if (this._timeoutId !== null) {
            window.clearTimeout(this._timeoutId);
        }
        const level = Math.floor(this._clearedLines / 10);
        let frames;
        if (level < 9) {
            frames = 48 - (level * 5);
        } else if (level < 10) {
            frames = 6;
        } else if (level < 13) {
            frames = 5;
        } else if (level < 16) {
            frames = 4;
        } else if (level < 19) {
            frames = 3;
        } else if (level < 29) {
            frames = 2;
        } else {
            frames = 1;
        }
        this._timeoutId = window.setTimeout(this.tick, (frames / 60) * 1000);
    }

    endGame() {
        this._gameOver = true;
        window.clearTimeout(this._timeoutId);
        window.removeEventListener('keydown', this.handleInput);
        gameOverScreen.querySelector('#game-over-score').textContent = this._score.toLocaleString();
        gameOverScreen.classList.remove('disabled');
        gameOverScreen.classList.add('enabled');
        window.addEventListener('keydown', gameOverInputHandler);
        document.getElementById('play-again-btn').addEventListener('click', playAgain);
    }

    _updateScores() {
        for (const span of document.querySelectorAll('.score-span')) {
            span.textContent = this._score.toLocaleString();
        }
        for (const span of document.querySelectorAll('.level-span')) {
            span.textContent = Math.floor(this._clearedLines / 10);
        }
    }

    _commitAndSetupNewPiece() {
        this._commitPieceToGrid(this._droppingPiece);
        if (this._collision(this._nextPiece)) {
            this.endGame();
        } else {
            this._droppingPiece = this._nextPiece;
            this._nextPiece = newPiece();
        }
    }
    
    _lookupGrid(x, y) {
        return this._grid[(y * GRID_WIDTH) + x];
    }

    _setGrid(x, y, cell) {
        this._grid[(y * GRID_WIDTH) + x] = cell;
    }

    _checkMovement(piece, dir) {
        for (const coord of piece.data) {
            const x = coord.x + piece.position.x + dir;
            const y = coord.y + piece.position.y;
            if (x < 0 || x >= GRID_WIDTH || this._lookupGrid(x, y) != 0) {
                return false;
            }
        }
        return true;
    }

    _collision(piece) {
        for (const coord of piece.data) {
            const x = coord.x + piece.position.x;
            const y = coord.y + piece.position.y;
            if (this._lookupGrid(x, y) != 0) {
                return true;
            }
        }
        return false;
    }
    
    _isPieceResting(piece) {
        for (const coord of piece.data) {
            const x = coord.x + piece.position.x;
            const y = coord.y + piece.position.y + 1;
            if (y >= GRID_HEIGHT || this._lookupGrid(x, y) != 0) {
                return true;
            }
        }
        return false;
    }

    _rotateAndCheck(shape, dir) {
        let testShape = {
            data: shape.data.map(c => { return {...c}; }),
            position: {...shape.position}
        };
        rotate(testShape, dir);
        let [top, right, bottom, left] = measurePiece(testShape);
        top += testShape.position.y;
        right += testShape.position.x;
        bottom += testShape.position.y;
        left += testShape.position.x;
        if (top < 0) {
            testShape.position.y -= top;
            top = 0;
            bottom -= top;
        }
        if (left < 0) {
            testShape.position.x -= left;
            left = 0;
            right -= left; 
        } else if (right >= GRID_WIDTH) {
            testShape.position.x -= (right - GRID_WIDTH) + 1;
            right = GRID_WIDTH - 1;
            left -= (right - GRID_WIDTH) + 1; 
        }
        for (let i = 0; i < testShape.data.length; i += 1) {
            const coord = testShape.data[i];
            const x = coord.x + testShape.position.x;
            const y = coord.y + testShape.position.y;
            if (y >= GRID_HEIGHT || this._lookupGrid(x, y) != 0) {
                return false;
            }
        }
        shape.data = testShape.data;
        shape.position = testShape.position;
        return true;
    }    

    _findCompletedLines(minY, maxY) {
        // Check for complete rows
        let completedLines = [];
        for (let y = minY; y <= maxY; y += 1) {
            let complete = true;
            for (let x = 0; x < GRID_WIDTH; x += 1) {
                if (this._lookupGrid(x, y) == 0) {
                    complete = false;
                    break;
                }
            }
    
            if (complete) {
                completedLines.push(y);
            }
        }
        return completedLines;
    }

    _calculatePoints(linesCleared) {
        const level = Math.floor(this._clearedLines / 10) + 1;
        switch (linesCleared) {
            case 1: return 40 * level;
            case 2: return 100 * level;
            case 3: return 300 * level;
            case 4: return 1200 * level;
        }
    }
    
    _commitPieceToGrid(piece) {
        let minY = GRID_HEIGHT;
        let maxY = -1;
        for (const coord of piece.data) {
            const x = coord.x + piece.position.x;
            const y = coord.y + piece.position.y;
            this._setGrid(x, y, piece.color);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
    
        this._highestBlockY = Math.min(this._highestBlockY, minY);

        const completedLines = this._findCompletedLines(minY, maxY);
        if (completedLines.length > 0) {
            this._clearedLines += completedLines.length;
            this._score += this._calculatePoints(completedLines.length);
            this._updateScores();

            // Clear the completed lines
            let completedLine = completedLines.pop();
            let wy = completedLine;
            let ry = completedLine;
            while (wy >= this._highestBlockY) {
                if (ry === completedLine) {
                    // Move the read pointer up a row to skip this line.
                    ry -= 1;
                    completedLine = completedLines.pop();
                } else {
                    // Copy the read row to the write row.
                    if (ry < 0) {
                        this._grid.fill(0, wy * GRID_WIDTH, (wy + 1) * GRID_WIDTH);
                    } else {
                        this._grid.copyWithin(wy * GRID_WIDTH, ry * GRID_WIDTH, (ry + 1) * GRID_WIDTH);
                    }
                    wy -= 1;
                    ry -= 1;
                }
            }
        }
    }

    render() {
        const CELL_SIZE = ctx.canvas.height / GRID_HEIGHT;
        this._renderImpl(ctx, CELL_SIZE);
        this._renderImpl(shadowCtx, CELL_SIZE);
        this._renderNextPiece(nextCtx, CELL_SIZE);
        this._renderNextPiece(nextShadowCtx, CELL_SIZE);
    }
    
    _renderImpl(ctx, CELL_SIZE) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.save();
        
        // Draw the falling piece.
        ctx.fillStyle = COLORS[this._droppingPiece.color - 1];
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (const coord of this._droppingPiece.data) {
            const x = (this._droppingPiece.position.x + coord.x) * CELL_SIZE;
            const y = (this._droppingPiece.position.y + coord.y) * CELL_SIZE;
            ctx.rect(x, y, CELL_SIZE, CELL_SIZE);
        }
        ctx.fill();
        ctx.stroke();
    
        // Draw the grid.
        for (let y = 0; y < GRID_HEIGHT; y += 1) {
            for (let x = 0; x < GRID_WIDTH; x += 1) {
                const cell = this._lookupGrid(x, y);
                if (cell != 0) {
                    ctx.beginPath();
                    ctx.fillStyle = COLORS[cell - 1];
                    ctx.rect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    ctx.fill();
                    ctx.stroke();
                }
            }
        }
    
        ctx.restore();
    }

    _renderNextPiece(ctx, CELL_SIZE) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        const viewportOriginX = Math.floor(ctx.canvas.width * 0.5);
        const viewportOriginY = Math.floor(ctx.canvas.height * 0.5);
        const [originX, originY] = findPieceOrigin(this._nextPiece, CELL_SIZE);
        const dx = viewportOriginX - originX;
        const dy = viewportOriginY - originY;
    
        ctx.save();
        ctx.translate(dx, dy);
        ctx.lineWidth = 0.5;
        ctx.fillStyle = COLORS[this._nextPiece.color - 1];
        ctx.beginPath();
        for (const coord of this._nextPiece.data) {
            ctx.rect(coord.x * CELL_SIZE, coord.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    handleInput(event) {
        if (this._gameOver) {
            // There may be events in the pipeline that we receive even
            // after the keyevent listener has been detached.
            return;
        }
        switch (event.keyCode) {
            case 37:
                // Left
                event.preventDefault();
                if (this._checkMovement(this._droppingPiece, -1)) {
                    this._droppingPiece.position.x -= 1;
                    window.requestAnimationFrame(this.render);
                }
                break;
            case 38:
                // Up
                event.preventDefault();
                if (this._rotateAndCheck(this._droppingPiece, -1)) {
                    window.requestAnimationFrame(this.render);
                }
                break;
            case 39:
                // Right
                event.preventDefault();
                if (this._checkMovement(this._droppingPiece, 1)) {
                    this._droppingPiece.position.x += 1;
                    window.requestAnimationFrame(this.render);
                }
                break;
            case 40:
                // Down
                event.preventDefault();
                if (this._isPieceResting(this._droppingPiece)) {
                    this._commitAndSetupNewPiece();
                } else {
                    this._droppingPiece.position.y += 1;
                }
                window.requestAnimationFrame(this.render);
                this._scheduleTick();
                break;
            case 32:
                // Space
                event.preventDefault();
                while (!this._isPieceResting(this._droppingPiece)) {
                    this._droppingPiece.position.y += 1;
                }
                this._commitAndSetupNewPiece();
                window.requestAnimationFrame(this.render);
                this._scheduleTick();
                break;
        }
    }
}

function rotate(shape, dir) {
    for (let i = 0; i < shape.data.length; i += 1) {
        let coord = shape.data[i];
        const x = (-dir) * coord.y;
        const y = dir * coord.x;
        coord.x = x;
        coord.y = y;
    }
}

function newPiece() {
    const keys = Object.keys(SHAPES);
    const shapeName = keys[Math.floor(Math.random() * keys.length)];
    let shape = {
        color: Math.floor(Math.random() * COLORS.length) + 1,
        position: {x: Math.floor(GRID_WIDTH / 2), y: 0},
        data: SHAPES[shapeName].map(coord => { return {x: coord.x, y: coord.y}; }),
    };
    const rotations = Math.floor(Math.random() * 4);
    for (let i = 0; i < rotations; i += 1) {
        rotate(shape, 1);
    }
    const [top, _right, _bottom, _left] = measurePiece(shape);
    shape.position.y -= top;
    return shape;
}

function measurePiece(piece) {
    let left = 100;
    let right = -100;
    let top = 100;
    let bottom = -100;
    for (const coord of piece.data) {
        left = Math.min(left, coord.x);
        right = Math.max(right, coord.x);
        top = Math.min(top, coord.y);
        bottom = Math.max(bottom, coord.y);
    }
    return [top, right, bottom, left];
}

function findPieceOrigin(piece, CELL_SIZE) {
    let [top, right, bottom, left] = measurePiece(piece);
    top = top * CELL_SIZE;
    right = (right + 1) * CELL_SIZE;
    bottom = (bottom + 1) * CELL_SIZE;
    left = left * CELL_SIZE;
    const width = right - left;
    const height = bottom - top;
    const originX = Math.floor(width * 0.5) + left;
    const originY = Math.floor(height * 0.5) + top;
    return [originX, originY];
}

function setup() {
    ctx = document.getElementById('canvas').getContext('2d');
    nextCtx = document.getElementById('next').getContext('2d');
    shadowCtx = document.getElementById('shadow').getContext('2d');
    nextShadowCtx = document.getElementById('next-shadow').getContext('2d');
    gameOverScreen = document.getElementById('game-over-screen');
    document.getElementById('start-btn').addEventListener('click', () => {
        const startScreen = document.getElementById('start-screen');
        startScreen.classList.remove('enabled');
        startScreen.classList.add('disabled');
        game = new Game();
    });
}

function playAgain() {
    game = new Game();
    gameOverScreen.classList.remove('enabled');
    gameOverScreen.classList.add('disabled');
    window.removeEventListener('keydown', gameOverInputHandler);
    document.getElementById('play-again-btn').removeEventListener('click', playAgain);
}

function gameOverInputHandler(event) {
    // Shortcut: spacebar restarts the game.
    if (event.keyCode === 32) {
        event.preventDefault();
        playAgain();
    }
}

window.onload = setup;
