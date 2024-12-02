import { useState, useEffect, useCallback, useRef } from 'react';

const GAME_HEIGHT = 700;
const GAME_WIDTH = 1100;
const PLANE_SIZE = 100; // Increased for better sprite visibility
const WEAPON_SIZE = 40;
const INITIAL_SPEED = 8;
const SPEED_INCREMENT = 0.001;
const SPAWN_RATE = 0.04;

const Game = () => {
  const [carpetPosition, setCarpetPosition] = useState({ x: 100, y: GAME_HEIGHT / 2 });
  const [weapons, setWeapons] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [isMovingUp, setIsMovingUp] = useState(false);
  const [isMovingDown, setIsMovingDown] = useState(false);
  const gameLoopRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize background music
  useEffect(() => {
    audioRef.current = new Audio('/bg.mp3');
    audioRef.current.loop = true;
    
    const startMusic = () => {
      audioRef.current.play();
      document.removeEventListener('keydown', startMusic);
    };
    document.addEventListener('keydown', startMusic);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Game loop with improved collision detection
  useEffect(() => {
    if (gameOver) return;

    gameLoopRef.current = setInterval(() => {
      setScore(prev => prev + 1);
      setSpeed(prev => prev + SPEED_INCREMENT);

      setWeapons ( prev => {
        const filtered = prev.filter(weapon => weapon.x > -WEAPON_SIZE);
        const moved = filtered.map(weapon => ({
          ...weapon,
          x: weapon.x - speed
        }));

        if (Math.random() < SPAWN_RATE) {
          moved.push({
            x: GAME_WIDTH,
            y: Math.random() * (GAME_HEIGHT - WEAPON_SIZE),
            rotation: 0
          });
        }

        // Improved collision detection
        for (const weapon of moved) {
          const HORIZONTAL_PADDING = 30;
          const TOP_PADDING = 15;
          const BOTTOM_PADDING = 30;

          const carpetBox = {
            left: carpetPosition.x + HORIZONTAL_PADDING,
            right: carpetPosition.x + PLANE_SIZE - HORIZONTAL_PADDING,
            top: carpetPosition.y + TOP_PADDING,
            bottom: carpetPosition.y + PLANE_SIZE - BOTTOM_PADDING
          };

          const weaponBox = {
            left: weapon.x + 10,
            right: weapon.x + WEAPON_SIZE - 10,
            top: weapon.y + 10,
            bottom: weapon.y + WEAPON_SIZE - 10
          };

          if (
            carpetBox.left < weaponBox.right &&
            carpetBox.right > weaponBox.left &&
            carpetBox.top < weaponBox.bottom &&
            carpetBox.bottom > weaponBox.top
          ) {
            const overlapX = Math.min(carpetBox.right - weaponBox.left, weaponBox.right - carpetBox.left);
            const overlapY = Math.min(carpetBox.bottom - weaponBox.top, weaponBox.bottom - carpetBox.top);
            
            if (overlapX > 10 && overlapY > 10) {
              setGameOver(true);
              if (audioRef.current) {
                audioRef.current.pause();
              }
              break;
            }
          }
        }

        return moved;
      });
    }, 1000 / 60);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameOver, speed]);
  
  // Movement handling
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'ArrowUp') setIsMovingUp(true);
    if (event.key === 'ArrowDown') setIsMovingDown(true);
  }, []);

  const handleKeyUp = useCallback((event) => {
    if (event.key === 'ArrowUp') setIsMovingUp(false);
    if (event.key === 'ArrowDown') setIsMovingDown(false);
  }, []);

  useEffect(() => {
    if (gameOver) return;

    const moveInterval = setInterval(() => {
      setCarpetPosition(prev => {
        let newY = prev.y;
        const MOVE_SPEED = 10;

        if (isMovingUp) {
          newY = Math.max(0, prev.y - MOVE_SPEED);
        }
        if (isMovingDown) {
          newY = Math.min(GAME_HEIGHT - PLANE_SIZE, prev.y + MOVE_SPEED);
        }

        return { ...prev, y: newY };
      });
    }, 16);

    return () => clearInterval(moveInterval);
  }, [isMovingUp, isMovingDown, gameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const resetGame = () => {
    setCarpetPosition({ x: 100, y: GAME_HEIGHT / 2 });
    setWeapons([]);
    setGameOver(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-300 to-yellow-300 p-4">
      <div 
        className="relative w-[1100px] h-[700px] overflow-hidden rounded-lg shadow-2xl border-4 border-blue-500"
        style={{
          backgroundImage: "url('/bg1.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: `${-score}px 0`,
        }}
      >
        <div className="absolute top-4 right-4 text-xl font-bold text-white bg-yellow-500 p-3 rounded-lg shadow-lg">
          Score: {score}
        </div>
        <div
          className="absolute"
          style={{
            transform: `translate(${carpetPosition.x}px, ${carpetPosition.y}px)`,
            width: `${PLANE_SIZE}px`,
            height: `${PLANE_SIZE}px`,
          }}
        >
          <img 
            src="/flying.gif"
            alt="AeroPlane"
            className="w-full h-full object-contain"
          />
        </div>
        {weapons.map((weapon, index) => (
  <div
    key={index}
    className="absolute"
    style={{
      transform: `translate(${weapon.x}px, ${weapon.y}px) rotate(${weapon.rotation}deg)`,
      width: `${WEAPON_SIZE}px`,
      height: `${WEAPON_SIZE}px`,
    }}
  >
    {/* Replace the stone image with a crow flying towards the carpet */}
    <img
      src="/crow.gif"  // Replace with the URL of the crow image
      alt="Crow"
      className="w-full h-full"
    />
  </div>
))}

        {gameOver && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="text-center text-white p-8 bg-blue-900 rounded-lg shadow-2xl">
              <h2 className="text-4xl font-bold mb-4">Game Over!</h2>
              <p className="text-2xl mb-6">Final Score: {score}</p>
              <button
                className="px-6 py-3 bg-yellow-500 text-blue-900 rounded-lg text-xl font-bold hover:bg-yellow-400"
                onClick={resetGame}
              >
                Play Again
              </button>
            </div>
          </div>
        )}
        <div className="absolute bottom-4 left-4 text-white bg-blue-500 bg-opacity-75 p-3 rounded-lg">
          Use ↑ and ↓ arrows to move
        </div>
      </div>
    </div>
  );
};

export default Game;
