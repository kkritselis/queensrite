document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const canvasSize = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8);
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    
    // Get the computed styles to access CSS variables
    const computedStyle = getComputedStyle(document.documentElement);
    
    // Color palette from CSS variables
    const colors = {
        player1Piece: computedStyle.getPropertyValue('--player1-piece').trim(),
        player1Base: computedStyle.getPropertyValue('--player1-base').trim(),
        player2Piece: computedStyle.getPropertyValue('--player2-piece').trim(),
        player2Base: computedStyle.getPropertyValue('--player2-base').trim(),
        background: computedStyle.getPropertyValue('--background').trim(),
    };
    
    // Background color
    canvas.style.backgroundColor = colors.background;
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Hexagon properties
    const hexSize = canvasSize / 22; // Radius of hexagons (adjusted to fit board)
    
    // Board properties - 5 hexagons on each side means 9 hexagons in the middle row
    const boardSize = 5; // Number of hexagons on each side
    
    // Center of the canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Game state
    const gameState = {
        currentPlayer: 'player1', // player1 or player2 (computer)
        player1Position: { q: 0, r: -boardSize, s: boardSize },
        player2Position: { q: 0, r: boardSize, s: -boardSize },
        board: {}, // Will be filled with hex types
        highlightedHexes: [], // For showing valid moves
        gameOver: false,
        message: "Your turn! Click a valid move (highlighted)."
    };
    
    // Initialize the game
    initGame();
    
    // Add event listener for player moves
    canvas.addEventListener('click', handleCanvasClick);
    
    // Function to initialize the game
    function initGame() {
        // Generate balanced random distribution of base tiles
        const baseDistribution = generateBalancedDistribution(boardSize);
        
        // Create the game board with the distribution
        createGameBoard(baseDistribution);
        
        // Calculate initial valid moves for player 1
        gameState.highlightedHexes = getValidMoves(gameState.player1Position);
        
        // Draw the initial board state
        drawGame();
    }
    
    // Function to create the game board
    function createGameBoard(distribution) {
        // Clear the board
        gameState.board = {};
        
        // Use axial coordinates for a hexagonal grid
        for (let q = -boardSize; q <= boardSize; q++) {
            // Calculate the row limits for this column
            const r1 = Math.max(-boardSize, -q - boardSize);
            const r2 = Math.min(boardSize, -q + boardSize);
            
            for (let r = r1; r <= r2; r++) {
                // Calculate the third cubic coordinate
                const s = -q - r;
                
                // Create a key for this position
                const key = `${q},${r},${s}`;
                
                // Determine hex type
                let hexType;
                
                // Center hex is empty
                if (q === 0 && r === 0 && s === 0) {
                    hexType = 'empty';
                }
                // Top center is player 1 piece
                else if (q === 0 && r === -boardSize && s === boardSize) {
                    hexType = 'player1Piece';
                }
                // Bottom center is player 2 piece
                else if (q === 0 && r === boardSize && s === -boardSize) {
                    hexType = 'player2Piece';
                }
                // Otherwise use the distribution
                else {
                    hexType = distribution[key] || 'player1Base';
                }
                
                // Add the hex to the board
                gameState.board[key] = hexType;
            }
        }
    }
    
    // Function to generate a balanced distribution of base tiles
    function generateBalancedDistribution(boardSize) {
        // Calculate total number of hexes (excluding center and player pieces)
        let totalHexes = 0;
        const hexPositions = [];
        
        // Collect all valid hex positions
        for (let q = -boardSize; q <= boardSize; q++) {
            const r1 = Math.max(-boardSize, -q - boardSize);
            const r2 = Math.min(boardSize, -q + boardSize);
            
            for (let r = r1; r <= r2; r++) {
                const s = -q - r;
                
                // Skip the center hex and player piece positions
                if ((q === 0 && r === 0 && s === 0) || 
                    (q === 0 && r === -boardSize && s === boardSize) ||
                    (q === 0 && r === boardSize && s === -boardSize)) {
                    continue;
                }
                
                // Add valid position to our list
                hexPositions.push({ q, r, s });
                totalHexes++;
            }
        }
        
        // Determine how many of each type we need
        const player1BaseCount = Math.floor(totalHexes / 2);
        const player2BaseCount = totalHexes - player1BaseCount;
        
        // Start with all hexes as player 2 base
        const distribution = {};
        hexPositions.forEach(pos => {
            const key = `${pos.q},${pos.r},${pos.s}`;
            distribution[key] = 'player2Base';
        });
        
        // Randomly select positions for player 1 base
        const shuffled = [...hexPositions].sort(() => 0.5 - Math.random());
        for (let i = 0; i < player1BaseCount; i++) {
            const pos = shuffled[i];
            const key = `${pos.q},${pos.r},${pos.s}`;
            distribution[key] = 'player1Base';
        }
        
        return distribution;
    }
    
    // Function to handle canvas clicks
    function handleCanvasClick(event) {
        // Only handle clicks if it's the player's turn and game is not over
        if (gameState.currentPlayer !== 'player1' || gameState.gameOver) {
            return;
        }
        
        // Get click coordinates relative to canvas
        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        // Find the hex that was clicked
        const clickedHex = findHexFromPixel(clickX, clickY);
        
        // Check if the clicked hex is a valid move
        if (clickedHex && isValidMove(gameState.player1Position, clickedHex)) {
            // Make the player's move
            makeMove('player1', clickedHex);
            
            // Check for game over
            if (checkGameOver()) {
                gameState.gameOver = true;
                gameState.message = "Game Over! No more valid moves for you. Computer wins!";
                drawGame();
                return;
            }
            
            // Computer's turn
            setTimeout(() => {
                computerMove();
                
                // Check for game over again
                if (checkGameOver()) {
                    gameState.gameOver = true;
                    gameState.message = "Game Over! No more valid moves for computer. You win!";
                }
                
                drawGame();
            }, 500);
        }
        
        // Update the display
        drawGame();
    }
    
    // Function to find a hex from pixel coordinates
    function findHexFromPixel(pixelX, pixelY) {
        // Width and height of a single hexagon
        const hexWidth = hexSize * Math.sqrt(3);
        const hexHeight = hexSize * 2;
        
        // Distance between hexagon centers
        const horizontalDistance = hexWidth;
        const verticalDistance = hexHeight * 0.95;
        
        // Adjust to hex coordinate space from pixel space
        const adjustedX = pixelX - centerX;
        const adjustedY = pixelY - centerY;
        
        // Find the closest hex
        let closestHex = null;
        let minDistance = Infinity;
        
        // Loop through all possible hexes
        for (let q = -boardSize; q <= boardSize; q++) {
            const r1 = Math.max(-boardSize, -q - boardSize);
            const r2 = Math.min(boardSize, -q + boardSize);
            
            for (let r = r1; r <= r2; r++) {
                const s = -q - r;
                
                // Calculate pixel position of this hex
                const hexX = q * horizontalDistance;
                const hexY = r * verticalDistance + q * verticalDistance/2;
                
                // Calculate distance from click to hex center
                const distance = Math.sqrt((adjustedX - hexX) ** 2 + (adjustedY - hexY) ** 2);
                
                // Update if this is the closest hex so far
                if (distance < minDistance) {
                    minDistance = distance;
                    closestHex = { q, r, s };
                }
            }
        }
        
        // Only return the hex if the click was close enough
        return minDistance <= hexSize * 1.5 ? closestHex : null;
    }
    
    // Function to check if a move is valid
    function isValidMove(fromPos, toPos) {
        // Make sure the destination is on the board and not empty
        const key = `${toPos.q},${toPos.r},${toPos.s}`;
        
        // Can't move to empty spaces or spaces with player pieces
        if (!gameState.board[key] || 
            gameState.board[key] === 'empty' ||
            gameState.board[key] === 'player1Piece' ||
            gameState.board[key] === 'player2Piece') {
            return false;
        }
        
        // Must move in a straight line in one of the six directions
        const directions = [
            { q: 1, r: -1, s: 0 },  // right
            { q: 1, r: 0, s: -1 },  // bottom right
            { q: 0, r: 1, s: -1 },  // bottom left
            { q: -1, r: 1, s: 0 },  // left
            { q: -1, r: 0, s: 1 },  // top left
            { q: 0, r: -1, s: 1 }   // top right
        ];
        
        // Check each direction
        for (const dir of directions) {
            let currentPos = { ...fromPos };
            
            // Keep stepping in this direction
            while (true) {
                // Take a step in the current direction
                currentPos.q += dir.q;
                currentPos.r += dir.r;
                currentPos.s += dir.s;
                
                // Create a key for this position
                const currentKey = `${currentPos.q},${currentPos.r},${currentPos.s}`;
                
                // Check if we've gone out of bounds or hit a player piece or empty hex
                if (!gameState.board[currentKey] || 
                    gameState.board[currentKey] === 'empty' ||
                    gameState.board[currentKey] === 'player1Piece' || 
                    gameState.board[currentKey] === 'player2Piece') {
                    break;
                }
                
                // If this is our target, it's a valid move
                if (currentPos.q === toPos.q && currentPos.r === toPos.r && currentPos.s === toPos.s) {
                    return true;
                }
            }
        }
        
        // If we got here, no valid path was found
        return false;
    }
    
    // Function to get all valid moves from a position
    function getValidMoves(fromPos) {
        const validMoves = [];
        
        // Check in all six directions
        const directions = [
            { q: 1, r: -1, s: 0 },  // right
            { q: 1, r: 0, s: -1 },  // bottom right
            { q: 0, r: 1, s: -1 },  // bottom left
            { q: -1, r: 1, s: 0 },  // left
            { q: -1, r: 0, s: 1 },  // top left
            { q: 0, r: -1, s: 1 }   // top right
        ];
        
        // Check each direction
        for (const dir of directions) {
            let currentPos = { ...fromPos };
            
            // Keep stepping in this direction
            while (true) {
                // Take a step in the current direction
                currentPos.q += dir.q;
                currentPos.r += dir.r;
                currentPos.s += dir.s;
                
                // Create a key for this position
                const currentKey = `${currentPos.q},${currentPos.r},${currentPos.s}`;
                
                // Check if we've gone out of bounds or hit a player piece or empty hex
                if (!gameState.board[currentKey] || 
                    gameState.board[currentKey] === 'empty' ||
                    gameState.board[currentKey] === 'player1Piece' || 
                    gameState.board[currentKey] === 'player2Piece') {
                    break;
                }
                
                // This is a valid move
                validMoves.push({ ...currentPos });
            }
        }
        
        return validMoves;
    }
    
    // Function to make a move
    function makeMove(player, toPos) {
        // Get the player's current position
        const fromPos = player === 'player1' ? gameState.player1Position : gameState.player2Position;
        
        // Create keys for the positions
        const fromKey = `${fromPos.q},${fromPos.r},${fromPos.s}`;
        const toKey = `${toPos.q},${toPos.r},${toPos.s}`;
        
        // Get the current tile type
        const fromType = gameState.board[fromKey];
        
        // Determine if this is an opponent's base tile
        const isOpponentBase = (player === 'player1' && fromType === 'player2Base') ||
                                (player === 'player2' && fromType === 'player1Base');
        
        // If player is leaving opponent's base, remove the tile (scorched earth)
        if (isOpponentBase) {
            // Set to empty to indicate the tile is removed
            gameState.board[fromKey] = 'empty';
        } else {
            // Otherwise, just clear the player piece
            gameState.board[fromKey] = fromType === 'player1Piece' || fromType === 'player2Piece' 
                ? 'empty' : fromType;
        }
        
        // Save the destination type before overwriting
        const destType = gameState.board[toKey];
        
        // Move the player piece
        gameState.board[toKey] = player === 'player1' ? 'player1Piece' : 'player2Piece';
        
        // Update the player's position
        if (player === 'player1') {
            gameState.player1Position = { ...toPos };
            gameState.currentPlayer = 'player2';
            gameState.message = "Computer is thinking...";
        } else {
            gameState.player2Position = { ...toPos };
            gameState.currentPlayer = 'player1';
            gameState.message = "Your turn! Click a valid move (highlighted).";
        }
        
        // Find new valid moves after this move
        gameState.highlightedHexes = getValidMoves(
            gameState.currentPlayer === 'player1' ? gameState.player1Position : gameState.player2Position
        );
    }
    
    // Function to handle computer's move
    function computerMove() {
        // Get all valid moves for the computer
        const validMoves = getValidMoves(gameState.player2Position);
        
        // If no valid moves, computer loses
        if (validMoves.length === 0) {
            gameState.gameOver = true;
            gameState.message = "You win! Computer has no valid moves.";
            return;
        }
        
        // Simple AI: prioritize moves that can remove opponent's base tiles
        let bestMove = null;
        let bestScore = -Infinity;
        
        // Get current position info
        const currentPos = gameState.player2Position;
        const currentKey = `${currentPos.q},${currentPos.r},${currentPos.s}`;
        const currentHexType = gameState.board[currentKey];
        const isOnPlayerBase = currentHexType === 'player1Base';
        
        for (const move of validMoves) {
            let score = 0;
            const key = `${move.q},${move.r},${move.s}`;
            
            // Prioritize capturing opponent base tiles
            if (gameState.board[key] === 'player1Base') {
                score += 10;
            }
            
            // If we're on a player base, prioritize moving off it to remove it
            if (isOnPlayerBase) {
                score += 20; // Makes this the highest priority move
            }
            
            // Add some randomness to prevent predictable behavior
            score += Math.random() * 3;
            
            // Update best move if this is better
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        // If we found a move, make it
        if (bestMove) {
            makeMove('player2', bestMove);
        } else {
            // Fallback to random move if no "best" move
            const randomIndex = Math.floor(Math.random() * validMoves.length);
            makeMove('player2', validMoves[randomIndex]);
        }
    }
    
    // Function to check if the game is over
    function checkGameOver() {
        // Get valid moves for the current player
        const currentPos = gameState.currentPlayer === 'player1' 
            ? gameState.player1Position 
            : gameState.player2Position;
            
        const validMoves = getValidMoves(currentPos);
        
        // Game is over if no valid moves
        return validMoves.length === 0;
    }
    
    // Function to draw a single hexagon
    function drawHexagon(ctx, x, y, size, type, isHighlighted = false) {
        let fillColor;
        
        // Set fill color based on hex type
        switch (type) {
            case 'player1Piece':
                fillColor = colors.background; // Black background for player piece
                break;
            case 'player1Base':
                fillColor = colors.player1Base;
                break;
            case 'player2Piece':
                fillColor = colors.background; // Black background for player piece
                break;
            case 'player2Base':
                fillColor = colors.player2Base;
                break;
            case 'empty':
                return; // Don't draw empty hexes
            default:
                fillColor = colors.player1Base;
        }
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            // Start at 0 degrees for pointy-topped hexagons
            const angle = (Math.PI / 3) * i;
            const xPos = x + size * Math.cos(angle);
            const yPos = y + size * Math.sin(angle);
            
            if (i === 0) {
                ctx.moveTo(xPos, yPos);
            } else {
                ctx.lineTo(xPos, yPos);
            }
        }
        ctx.closePath();
        
        // Fill with highlight if this is a valid move
        if (isHighlighted) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
            
            // Redraw the path for the border
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const xPos = x + size * Math.cos(angle);
                const yPos = y + size * Math.sin(angle);
                
                if (i === 0) {
                    ctx.moveTo(xPos, yPos);
                } else {
                    ctx.lineTo(xPos, yPos);
                }
            }
            ctx.closePath();
        }
        
        ctx.fillStyle = fillColor;
        ctx.fill();
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // If this is a player piece hex, draw a circle on top
        if (type === 'player1Piece' || type === 'player2Piece') {
            const pieceColor = type === 'player1Piece' ? colors.player1Piece : colors.player2Piece;
            drawPlayerPiece(ctx, x, y, size * 0.6, pieceColor);
        }
    }
    
    // Function to draw a player piece (circle)
    function drawPlayerPiece(ctx, x, y, radius, color) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.closePath();
        
        ctx.fillStyle = color;
        ctx.fill();
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    // Function to draw the entire game
    function drawGame() {
        // Clear the canvas
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Width and height of a single hexagon
        const hexWidth = hexSize * Math.sqrt(3);
        const hexHeight = hexSize * 2;
        
        // Distance between hexagon centers
        const horizontalDistance = hexWidth;
        const verticalDistance = hexHeight * 0.95; // Increased vertical spacing
        
        // Use axial coordinates for a hexagonal grid
        for (let q = -boardSize; q <= boardSize; q++) {
            // Calculate the row limits for this column
            const r1 = Math.max(-boardSize, -q - boardSize);
            const r2 = Math.min(boardSize, -q + boardSize);
            
            for (let r = r1; r <= r2; r++) {
                // Calculate the third cubic coordinate (for boundary checking)
                const s = -q - r;
                
                // Calculate pixel position of this hexagon
                const x = centerX + q * horizontalDistance;
                const y = centerY + (r * verticalDistance + q * verticalDistance/2);
                
                // Create a key for this position
                const key = `${q},${r},${s}`;
                
                // Get the hex type
                const hexType = gameState.board[key];
                
                // Check if this hex is highlighted (valid move)
                const isHighlighted = gameState.highlightedHexes.some(
                    h => h.q === q && h.r === r && h.s === s
                );
                
                // Draw the hexagon
                drawHexagon(ctx, x, y, hexSize, hexType, isHighlighted);
            }
        }
        
        // Draw game status message
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(gameState.message, canvas.width / 2, 30);
    }
}); 