const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path'); // Add this at the top

const app = express();
const httpServer = createServer(app);

// Add these lines to serve static files
app.use(express.static(path.join(__dirname, '../client')));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/output.html'));
});

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e6 // 1 MB limit
});

// Game state
let gameState = {
    isActive: false,
    timeLimit: 30,
    clicksToWin: 10,
    winnerUrl: 'https://media.tenor.com/-Yf9G_sGZ-8AAAAM/youre-a-winner-winner.gif',
    loserUrl: 'https://media.tenor.com/1cd4rNbBLagAAAAM/diaryofawimpykid-loser.gif',
    teams: {
        popcorn: { 
            clicks: 0, 
            players: 0, 
            position: 0, 
            members: [],
            playerClicks: {} // Track individual player clicks
        },
        hamburger: { 
            clicks: 0, 
            players: 0, 
            position: 0, 
            members: [],
            playerClicks: {}
        },
        hotdog: { 
            clicks: 0, 
            players: 0, 
            position: 0, 
            members: [],
            playerClicks: {}
        }
    },
    timeRemaining: 0
};

let gameInterval;

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('userType', (data) => {
        console.log('User type received:', data.type);
        socket.userType = data.type;

        // Send initial state based on user type
        if (data.type === 'player') {
            socket.emit('gameState', gameState);
        } else if (data.type === 'producer') {
            socket.emit('producerData', {
                timeLimit: gameState.timeLimit,
                clicksToWin: gameState.clicksToWin,
                isActive: gameState.isActive
            });
        } else if (data.type === 'output') {
            socket.emit('outputData', gameState);
        }
    });

    // Handle player joining team
    socket.on('joinTeam', (data) => {
        try {
            console.log('Player joining team:', data.playerName);
            
            if (socket.team) {
                gameState.teams[socket.team].players--;
                const oldTeam = gameState.teams[socket.team].members;
                const playerIndex = oldTeam.findIndex(p => p.id === socket.id);
                if (playerIndex > -1) oldTeam.splice(playerIndex, 1);
            }

            socket.team = data.team;
            gameState.teams[data.team].players++;
            
            // Add player to team members with validated data
            gameState.teams[data.team].members.push({
                id: socket.id,
                name: data.playerName.substring(0, 50), // Limit name length
                avatar: data.playerAvatar || '/assets/images/default-avatar.png'
            });

            io.emit('gameState', gameState);
            
            console.log(`Player ${data.playerName} successfully joined ${data.team} team`);
        } catch (error) {
            console.error('Error joining team:', error);
            socket.emit('error', 'Failed to join team. Please try again.');
        }
    });

    // Handle player clicks
    socket.on('playerClick', () => {
        console.log('Click received from:', socket.id, 'Team:', socket.team); // Debug log
        
        if (socket.team && gameState.isActive) {
            const team = gameState.teams[socket.team];
            team.clicks++;
            
            // Find member data including avatar
            const memberData = team.members.find(m => m.id === socket.id);
            
            // Track individual player clicks with avatar
            if (!team.playerClicks[socket.id]) {
                team.playerClicks[socket.id] = {
                    name: memberData?.name || 'Unknown',
                    clicks: 0,
                    avatar: memberData?.avatar || '/assets/images/default-avatar.png'
                };
            }
            team.playerClicks[socket.id].clicks++;

            team.position = (team.clicks / gameState.clicksToWin) * 100;
            
            io.emit('gameState', gameState);

            if (team.clicks >= gameState.clicksToWin) {
                endGame(socket.team);
            }
        }
    });

    // Producer controls
    socket.on('updateSettings', (settings) => {
        if (socket.userType === 'producer') {
            gameState.timeLimit = settings.timeLimit;
            gameState.clicksToWin = settings.clicksToWin;
            if (settings.winnerUrl) gameState.winnerUrl = settings.winnerUrl;
            if (settings.loserUrl) gameState.loserUrl = settings.loserUrl;
            io.emit('gameState', gameState);
        }
    });

    socket.on('startGame', () => {
        if (socket.userType === 'producer' && !gameState.isActive) {
            startGame();
        }
    });

    socket.on('resetGame', () => {
        if (socket.userType === 'producer') {
            resetGame();
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnection:', socket.id);
        if (socket.team) {
            gameState.teams[socket.team].players--;
            const team = gameState.teams[socket.team].members;
            const playerIndex = team.findIndex(p => p.id === socket.id);
            if (playerIndex > -1) team.splice(playerIndex, 1);
            io.emit('gameState', gameState);
        }
    });
});

function startGame() {
    gameState.isActive = true;
    gameState.timeRemaining = gameState.timeLimit;
    
    gameInterval = setInterval(() => {
        gameState.timeRemaining--;
        io.emit('gameState', gameState);
        
        if (gameState.timeRemaining <= 0) {
            console.log('Game ended due to timeout'); // Debug log
            endGame('timeout');
        }
    }, 1000);

    io.emit('gameState', gameState);
}

function endGame(winner) {
    gameState.isActive = false;
    clearInterval(gameInterval);
    
    // Don't clear player clicks or leader info here
    io.emit('gameEnd', { 
        winner,
        winnerUrl: gameState.winnerUrl,
        loserUrl: gameState.loserUrl
    });
}

function resetGame() {
    clearInterval(gameInterval);
    
    gameState = {
        isActive: false,
        timeLimit: gameState.timeLimit, // preserve settings
        clicksToWin: gameState.clicksToWin, // preserve settings
        winnerUrl: gameState.winnerUrl,
        loserUrl: gameState.loserUrl,
        teams: {
            popcorn: { clicks: 0, players: 0, position: 0, members: [], playerClicks: {} },
            hamburger: { clicks: 0, players: 0, position: 0, members: [], playerClicks: {} },
            hotdog: { clicks: 0, players: 0, position: 0, members: [], playerClicks: {} }
        },
        timeRemaining: 0
    };

    // Force all clients to reset
    io.emit('forceReset', gameState);

}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});