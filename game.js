let canvasWidth = 800;
        let canvasHeight = 600;
        const blockSize = 20;
        let snake;
        let apple;
        let ctx;
        let widthInBlocks;
        let heightInBlocks;
        let delay = 160;
        const minDelay = 30;
        let score = 0;
        let highScore = localStorage.getItem('snakeHighScore') || 0;
        let isPaused = false;
        let gameInterval = null;
        let controlMode = null;
        let gameStarted = false;

        // Variables pour le swipe
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        // Détection automatique du type d'appareil
        function detectDevice() {
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isTouchDevice || isMobile) {
                return 'swipe';
            } else {
                return 'keyboard';
            }
        }

        window.onload = function() {
            controlMode = detectDevice();
            
            // Adapter l'affichage selon le type d'appareil
            if (controlMode === 'swipe') {
                document.getElementById('pcInstructions').style.display = 'none';
                document.getElementById('mobileInstructions').style.display = 'block';
                document.getElementById('startPrompt').textContent = 'Double-tapez pour commencer';
            }

            // Attendre que l'utilisateur démarre le jeu
            if (controlMode === 'keyboard') {
                document.addEventListener('keydown', function startWithKeyboard(e) {
                    if (e.key === ' ' && !gameStarted) {
                        e.preventDefault();
                        document.removeEventListener('keydown', startWithKeyboard);
                        startGame();
                    }
                });
            } else {
                let lastTap = 0;
                document.getElementById('startScreen').addEventListener('touchstart', function startWithTouch(e) {
                    const currentTime = new Date().getTime();
                    const tapLength = currentTime - lastTap;
                    if (tapLength < 300 && tapLength > 0 && !gameStarted) {
                        document.getElementById('startScreen').removeEventListener('touchstart', startWithTouch);
                        startGame();
                    }
                    lastTap = currentTime;
                });
            }
        };

        function startGame() {
            gameStarted = true;
            document.getElementById('startScreen').classList.add('hidden');

            // Adapter le canvas à la taille d'écran
            if (window.innerWidth < 850) {
                canvasWidth = Math.min(window.innerWidth - 40, 600);
                canvasHeight = Math.min(window.innerHeight - 250, 450);
            }

            widthInBlocks = Math.floor(canvasWidth / blockSize);
            heightInBlocks = Math.floor(canvasHeight / blockSize);

            // Configuration des contrôles
            if (controlMode === 'keyboard') {
                document.getElementById('controlInfo').innerHTML = 
                    '⌨️ <strong>Flèches</strong> pour diriger • <strong>Espace</strong> pour pause';
            } else if (controlMode === 'swipe') {
                document.getElementById('controlInfo').innerHTML = 
                    '👉 <strong>Glissez</strong> pour changer de direction • <strong>Double-tap</strong> pour pause';
            }

            init();
        }

        function init() {
            const canvas = document.getElementById('gameCanvas');
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            ctx = canvas.getContext('2d');

            const startX = Math.floor(widthInBlocks / 2);
            const startY = Math.floor(heightInBlocks / 2);
            snake = new Snake([
                [startX, startY],
                [startX - 1, startY],
                [startX - 2, startY],
                [startX - 3, startY]
            ], "right");
            
            apple = new Apple(getRandomPosition());

            document.getElementById('highScoreDisplay').textContent = `Meilleur score: ${highScore}`;

            setupControls();
            startGameLoop();
        }

        function setupControls() {
            if (controlMode === 'keyboard') {
                document.onkeydown = handleKeyboard;
            } else if (controlMode === 'swipe') {
                const canvas = document.getElementById('gameCanvas');
                canvas.addEventListener('touchstart', handleTouchStart, false);
                canvas.addEventListener('touchmove', handleTouchMove, false);
                canvas.addEventListener('touchend', handleTouchEnd, false);
                
                // Toucher le canvas pour pause en mode swipe
                let lastTap = 0;
                canvas.addEventListener('touchstart', function(e) {
                    const currentTime = new Date().getTime();
                    const tapLength = currentTime - lastTap;
                    if (tapLength < 300 && tapLength > 0) {
                        togglePause();
                        e.preventDefault();
                    }
                    lastTap = currentTime;
                });
            }
        }

        function handleKeyboard(event) {
            const key = event.key;
            event.preventDefault();

            switch (key) {
                case "ArrowLeft":
                    snake.setDirection("left");
                    break;
                case "ArrowUp":
                    snake.setDirection("up");
                    break;
                case "ArrowRight":
                    snake.setDirection("right");
                    break;
                case "ArrowDown":
                    snake.setDirection("down");
                    break;
                case " ":
                    restart();
                    break;
            }
        }

        function handleTouchStart(e) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }

        function handleTouchMove(e) {
            e.preventDefault();
        }

        function handleTouchEnd(e) {
            touchEndX = e.changedTouches[0].clientX;
            touchEndY = e.changedTouches[0].clientY;
            handleSwipe();
        }

        function handleSwipe() {
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const minSwipeDistance = 30;

            if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
                return;
            }

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0) {
                    snake.setDirection('right');
                } else {
                    snake.setDirection('left');
                }
            } else {
                if (deltaY > 0) {
                    snake.setDirection('down');
                } else {
                    snake.setDirection('up');
                }
            }
        }

        function startGameLoop() {
            if (gameInterval) {
                clearInterval(gameInterval);
            }
            gameInterval = setInterval(gameLoop, delay);
        }

        function gameLoop() {
            if (isPaused) return;

            snake.move();

            if (snake.checkCollision()) {
                gameOver();
            } else {
                if (snake.eat(apple)) {
                    score++;
                    updateScore();
                    
                    if (delay > minDelay) {
                        delay = Math.max(minDelay, delay - 2);
                        clearInterval(gameInterval);
                        gameInterval = setInterval(gameLoop, delay);
                    }

                    apple.position = getRandomPosition();
                }

                draw();
            }
        }

        function draw() {
            const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            for (let i = 0; i < widthInBlocks; i++) {
                ctx.beginPath();
                ctx.moveTo(i * blockSize, 0);
                ctx.lineTo(i * blockSize, canvasHeight);
                ctx.stroke();
            }
            for (let i = 0; i < heightInBlocks; i++) {
                ctx.beginPath();
                ctx.moveTo(0, i * blockSize);
                ctx.lineTo(canvasWidth, i * blockSize);
                ctx.stroke();
            }

            snake.draw();
            apple.draw();
        }

        function gameOver() {
            clearInterval(gameInterval);

            if (score > highScore) {
                highScore = score;
                localStorage.setItem('snakeHighScore', highScore);
                document.getElementById('highScoreDisplay').textContent = `Meilleur score: ${highScore}`;
            }

            ctx.save();
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            ctx.fillStyle = "#ff6b6b";
            ctx.font = "bold 70px Arial";
            ctx.textAlign = "center";
            ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
            ctx.shadowBlur = 10;
            const gameOverY = canvasHeight / 2 - 30;
            ctx.fillText("GAME OVER", canvasWidth / 2, gameOverY);

            ctx.fillStyle = "#ffffff";
            ctx.font = "25px Arial";
            ctx.fillText(`Score final: ${score}`, canvasWidth / 2, gameOverY + 60);

            ctx.font = "20px Arial";
            if (controlMode === 'keyboard') {
                ctx.fillText("Appuyez sur ESPACE pour recommencer", canvasWidth / 2, gameOverY + 100);
            } else {
                ctx.fillText("Double-touchez pour recommencer", canvasWidth / 2, gameOverY + 100);
                
                const canvas = document.getElementById('gameCanvas');
                let lastTap = 0;
                const restartHandler = function(e) {
                    const currentTime = new Date().getTime();
                    const tapLength = currentTime - lastTap;
                    if (tapLength < 300 && tapLength > 0) {
                        canvas.removeEventListener('touchstart', restartHandler);
                        restart();
                    }
                    lastTap = currentTime;
                };
                canvas.addEventListener('touchstart', restartHandler);
            }
            ctx.restore();
        }

        function restart() {
            if (snake.checkCollision()) {
                const startX = Math.floor(widthInBlocks / 2);
                const startY = Math.floor(heightInBlocks / 2);
                snake = new Snake([
                    [startX, startY],
                    [startX - 1, startY],
                    [startX - 2, startY],
                    [startX - 3, startY]
                ], "right");
                apple = new Apple(getRandomPosition());
                score = 0;
                delay = 150;
                isPaused = false;
                updateScore();
                startGameLoop();
            } else {
                togglePause();
            }
        }

        function togglePause() {
            isPaused = !isPaused;
            if (!isPaused) {
                draw();
            }
        }

        function updateScore() {
            document.getElementById('scoreDisplay').textContent = score;
        }

        function getRandomPosition() {
            let position;
            let isOnSnake;
            do {
                position = [
                    Math.floor(Math.random() * widthInBlocks),
                    Math.floor(Math.random() * heightInBlocks)
                ];
                isOnSnake = snake.body.some(segment => 
                    segment[0] === position[0] && segment[1] === position[1]
                );
            } while (isOnSnake);
            return position;
        }

        function drawBlock(position, color) {
            const x = position[0] * blockSize;
            const y = position[1] * blockSize;
            ctx.fillStyle = color;
            ctx.fillRect(x + 1, y + 1, blockSize - 2, blockSize - 2);
        }

        function Snake(body, direction) {
            this.body = body;
            this.direction = direction;

            this.draw = function() {
                for (let i = 0; i < this.body.length; i++) {
                    const greenShade = 255 - (i * 10);
                    const color = `rgb(0, ${Math.max(150, greenShade)}, 50)`;
                    drawBlock(this.body[i], color);

                    if (i === 0) {
                        ctx.fillStyle = "#ffffff";
                        const headX = this.body[0][0] * blockSize;
                        const headY = this.body[0][1] * blockSize;
                        
                        if (this.direction === "right") {
                            ctx.fillRect(headX + 12, headY + 4, 3, 3);
                            ctx.fillRect(headX + 12, headY + 12, 3, 3);
                        } else if (this.direction === "left") {
                            ctx.fillRect(headX + 4, headY + 4, 3, 3);
                            ctx.fillRect(headX + 4, headY + 12, 3, 3);
                        } else if (this.direction === "up") {
                            ctx.fillRect(headX + 4, headY + 4, 3, 3);
                            ctx.fillRect(headX + 12, headY + 4, 3, 3);
                        } else if (this.direction === "down") {
                            ctx.fillRect(headX + 4, headY + 12, 3, 3);
                            ctx.fillRect(headX + 12, headY + 12, 3, 3);
                        }
                    }
                }
            };

            this.move = function() {
                const head = this.body[0].slice();
                switch (this.direction) {
                    case "right": head[0] += 1; break;
                    case "left": head[0] -= 1; break;
                    case "up": head[1] -= 1; break;
                    case "down": head[1] += 1; break;
                }
                this.body.unshift(head);
                this.body.pop();
            };

            this.setDirection = function(newDirection) {
                const opposites = {
                    "right": "left",
                    "left": "right",
                    "up": "down",
                    "down": "up"
                };
                if (newDirection !== opposites[this.direction]) {
                    this.direction = newDirection;
                }
            };

            this.checkCollision = function() {
                const head = this.body[0];
                const x = head[0];
                const y = head[1];

                if (x < 0 || x >= widthInBlocks || y < 0 || y >= heightInBlocks) {
                    return true;
                }

                for (let i = 1; i < this.body.length; i++) {
                    if (x === this.body[i][0] && y === this.body[i][1]) {
                        return true;
                    }
                }
                return false;
            };

            this.eat = function(apple) {
                const head = this.body[0];
                if (head[0] === apple.position[0] && head[1] === apple.position[1]) {
                    this.body.push([-1, -1]);
                    return true;
                }
                return false;
            };
        }

        function Apple(position) {
            this.position = position;

            this.draw = function() {
                ctx.save();
                const x = this.position[0] * blockSize + blockSize / 2;
                const y = this.position[1] * blockSize + blockSize / 2;
                const radius = blockSize / 2 - 2;

                ctx.fillStyle = "#ff3333";
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
                ctx.beginPath();
                ctx.arc(x - 2, y - 2, radius / 3, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            };
        }