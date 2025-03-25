import { useState, useEffect, useCallback, useRef } from 'react';

// Base game dimensions for scaling
const BASE_GAME_HEIGHT = 700;
const BASE_GAME_WIDTH = 1400;
const BASE_PLANE_SIZE = 100;
const BASE_CROW_SIZE = 40;
const INITIAL_SPEED = 8;
const SPEED_INCREMENT = 0.005;
const SPAWN_RATE = 0.04;

const Game = () => {
  const gameContainerRef = useRef(null);
  const [dimensions, setDimensions] = useState({
    width: BASE_GAME_WIDTH,
    height: BASE_GAME_HEIGHT,
    scale: 1,
    planeSize: BASE_PLANE_SIZE,
    crowSize: BASE_CROW_SIZE
  });
  
  const [planePosition, setPlanePosition] = useState({ x: 100, y: BASE_GAME_HEIGHT / 2 });
  const [crows, setCrows] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [isMovingUp, setIsMovingUp] = useState(false);
  const [isMovingDown, setIsMovingDown] = useState(false);
  const gameLoopRef = useRef(null);
  const audioRef = useRef(null);

  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      const container = gameContainerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = window.innerHeight * 0.8; // Use 80% of viewport height
      
      // Calculate scale based on container size
      const scaleX = containerWidth / BASE_GAME_WIDTH;
      const scaleY = containerHeight / BASE_GAME_HEIGHT;
      const scale = Math.min(scaleX, scaleY);

      // Update dimensions with scaling
      setDimensions({
        width: BASE_GAME_WIDTH * scale,
        height: BASE_GAME_HEIGHT * scale,
        scale: scale,
        planeSize: BASE_PLANE_SIZE * scale,
        crowSize: BASE_CROW_SIZE * scale
      });

      // Adjust plane position for new scale
      setPlanePosition(prev => ({
        x: (prev.x / prevScale) * scale,
        y: (prev.y / prevScale) * scale
      }));
    };

    let prevScale = dimensions.scale;
    updateDimensions();

    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

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

      setCrows(prev => {
        const filtered = prev.filter(crow => crow.x > -dimensions.crowSize);
        const moved = filtered.map(crow => ({
          ...crow,
          x: crow.x - speed * dimensions.scale
        }));

        if (Math.random() < SPAWN_RATE) {
          moved.push({
            x: dimensions.width,
            y: Math.random() * (dimensions.height - dimensions.crowSize),
            rotation: 0
          });
        }

        // Improved collision detection with scaling
        for (const crow of moved) {
          const HORIZONTAL_PADDING = 30 * dimensions.scale;
          const TOP_PADDING = 15 * dimensions.scale;
          const BOTTOM_PADDING = 30 * dimensions.scale;

          const planeBox = {
            left: planePosition.x + HORIZONTAL_PADDING,
            right: planePosition.x + dimensions.planeSize - HORIZONTAL_PADDING,
            top: planePosition.y + TOP_PADDING,
            bottom: planePosition.y + dimensions.planeSize - BOTTOM_PADDING
          };

          const crowBox = {
            left: crow.x + (10 * dimensions.scale),
            right: crow.x + dimensions.crowSize - (10 * dimensions.scale),
            top: crow.y + (10 * dimensions.scale),
            bottom: crow.y + dimensions.crowSize - (10 * dimensions.scale)
          };

          if (
            planeBox.left < crowBox.right &&
            planeBox.right > crowBox.left &&
            planeBox.top < crowBox.bottom &&
            planeBox.bottom > crowBox.top
          ) {
            const overlapX = Math.min(planeBox.right - crowBox.left, crowBox.right - planeBox.left);
            const overlapY = Math.min(planeBox.bottom - crowBox.top, crowBox.bottom - planeBox.top);

            if (overlapX > 10 * dimensions.scale && overlapY > 10 * dimensions.scale) {
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
  }, [gameOver, speed, dimensions]);

  // Movement handling
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'ArrowUp') setIsMovingUp(true);
    if (event.key === 'ArrowDown') setIsMovingDown(true);
  }, []);

  const handleKeyUp = useCallback((event) => {
    if (event.key === 'ArrowUp') setIsMovingUp(false);
    if (event.key === 'ArrowDown') setIsMovingDown(false);
  }, []);

  const handleButtonDown = (direction) => {
    if (direction === 'up') setIsMovingUp(true);
    if (direction === 'down') setIsMovingDown(true);
  };

  const handleButtonUp = () => {
    setIsMovingUp(false);
    setIsMovingDown(false);
  };

  useEffect(() => {
    if (gameOver) return;

    const moveInterval = setInterval(() => {
      setPlanePosition(prev => {
        let newY = prev.y;
        const MOVE_SPEED = 10 * dimensions.scale;

        if (isMovingUp) {
          newY = Math.max(0, prev.y - MOVE_SPEED);
        }
        if (isMovingDown) {
          newY = Math.min(dimensions.height - dimensions.planeSize, prev.y + MOVE_SPEED);
        }

        return { ...prev, y: newY };
      });
    }, 16);

    return () => clearInterval(moveInterval);
  }, [isMovingUp, isMovingDown, gameOver, dimensions]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const resetGame = () => {
    setPlanePosition({ x: 100 * dimensions.scale, y: dimensions.height / 2 });
    setCrows([]);
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
        ref={gameContainerRef}
        className="w-full max-w-[1100px] relative"
      >
        <div
          className="relative overflow-hidden rounded-lg shadow-2xl border-4 border-blue-500"
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            backgroundImage: "url('/bg11.png')",
            backgroundSize: 'cover',
            backgroundPosition: `${-score}px 0`,
          }}
        >
          <div className="absolute top-4 right-4 text-xl font-bold text-white bg-yellow-500 p-3 rounded-lg shadow-lg z-10">
            Score: {score}
          </div>
          
          <div
            className="absolute"
            style={{
              transform: `translate(${planePosition.x}px, ${planePosition.y}px)`,
              width: `${dimensions.planeSize}px`,
              height: `${dimensions.planeSize}px`,
            }}
          >
            <img
              src="/flying.gif"
              alt="AeroPlane"
              className="w-full h-full object-contain"
            />
          </div>

          {crows.map((crow, index) => (
            <div
              key={index}
              className="absolute"
              style={{
                transform: `translate(${crow.x}px, ${crow.y}px) rotate(${crow.rotation}deg)`,
                width: `${dimensions.crowSize}px`,
                height: `${dimensions.crowSize}px`,
              }}
            >
              <img
                src="/crow.gif"
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

          {/* Mobile Controls - Show only on touch devices */}
          <div className="absolute bottom-4 right-4 flex flex-col space-y-4 md:hidden touch-none">
            <button
              className="w-16 h-16 bg-blue-500 bg-opacity-70 text-white rounded-full shadow-lg text-2xl font-bold active:bg-blue-600"
              onMouseDown={() => handleButtonDown('up')}
              onMouseUp={handleButtonUp}
              onTouchStart={() => handleButtonDown('up')}
              onTouchEnd={handleButtonUp}
            >
              ↑
            </button>
            <button
              className="w-16 h-16 bg-blue-500 bg-opacity-70 text-white rounded-full shadow-lg text-2xl font-bold active:bg-blue-600"
              onMouseDown={() => handleButtonDown('down')}
              onMouseUp={handleButtonUp}
              onTouchStart={() => handleButtonDown('down')}
              onTouchEnd={handleButtonUp}
            >
              ↓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
