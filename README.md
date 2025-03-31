# Vixi Race Game

A multiplayer clicking race game where players join teams and compete to reach the finish line first.

## Features

- Real-time multiplayer gameplay using Socket.IO
- Three teams: Popcorn, Hamburger, and Hot Dog
- Live leaderboard updates with player avatars
- Team progress tracking with animated runners
- Producer controls for game settings and race management
- Display output for viewing the race in real-time
- Player customization with names and avatars

## Game Roles

### Players
- Join one of three teams
- Upload custom avatars
- Compete by clicking as fast as possible
- See real-time team progress and click counts

### Producer
- Control game settings (time limit, clicks to win)
- Start and reset races
- Monitor team progress and statistics
- View team leaders and click counts

### Output Display
- Show real-time race progress
- Display team leaders with avatars
- Animate team runners
- Show winner celebrations

## Setup

1. Install dependencies:
```npm install```

2. Start the server:
```npm start```

3. Access the game:
- Players: http://localhost:3000
- Producer: http://localhost:3000/producer
- Output Display: http://localhost:3000/output

## Technologies Used

- Node.js
- Express
- Socket.IO
- UIkit CSS Framework
- Material Design Icons
EOL

# Add and commit the README
git add README.md
git commit -m "Add detailed README with game features and setup instructions"

# Push to GitHub
git push origin main
```

This README includes:
1. Game overview
2. Detailed features list
3. Different user roles and their capabilities
4. Setup instructions
5. Technologies used