$(document).ready(function () {
  let currentLevel = 1;
  const totalLevels = 25;
  let player;
  const game = $('#game');
  const levelComplete = $('#levelComplete');
  let isGameRunning = false;
  let hasLevelCompleted = false;
  let levelRestarted = false; // Flagga för att förhindra flera återställningar
  let isHurtSoundPlaying = false;
  let controlsLocked = false;

  let keys = {};
  let playerSpeed = 3;
  let jumpPower = 10;
  let gravity = 0.5;
  let velocityY = 0;
  let onGround = false;
  let collectedFruits = 0;
  let currentDirection = 'right'; // Håller reda på vilken riktning spelaren är vänd åt

  let startScreenAudio = new Audio('audio/bg3.ogg');
  let bgAudio = new Audio('audio/bg2.ogg');
  let jumpAudio = new Audio('audio/jump.ogg');
  let biteAudio = new Audio('audio/bite.wav');
  let levelupAudio = new Audio('audio/levelup.mp3');
  let hurtAudio = new Audio('audio/fail.wav');
  startScreenAudio.volume = 0.1;
  startScreenAudio.loop = true;
  bgAudio.volume = 0.1;
  bgAudio.loop = true;
  biteAudio.volume = 0.3;
  jumpAudio.volume = 0.5;
  levelupAudio.volume = 0.3;
  hurtAudio.volume = 0.3;

  // Array of background images
  var backgrounds = [
    'url(img/bg/blue.png)',
    'url(img/bg/brown.png)',
    'url(img/bg/gray.png)',
    'url(img/bg/green.png)',
    'url(img/bg/pink.png)',
    'url(img/bg/purple.png)',
    'url(img/bg/yellow.png)',
  ];

  // // Get a random index from the backgrounds array
  // var randomIndex = Math.floor(Math.random() * backgrounds.length);
  //
  // // Set the random background image to the #game-container
  // $('#game').css('background', backgrounds[randomIndex]);

	// Function to move the background sideways
  function moveBackground() {
    $('#game').animate({
      'background-position-y': '+=2px' // Adjust the speed by changing the value
    }, 100, 'linear', moveBackground);
  }

  function showLevelTransition(level, callback) {
    const transitionElement = $('#level-transition');
    transitionElement.text(`Nivå ${level}`);
    //transitionElement.fadeIn(1000, function () { // Fade in under 1 sekund
    transitionElement.fadeIn(function () { // Fade in under 1 sekund
      setTimeout(() => {
        transitionElement.fadeOut(800, callback); // Fade out under 1 sekund och kör callback
      }, 800);
    });
  }

  // Moving platforms
  const $platforms = $('.moving');
  const platformSpeed = 1; // Hastigheten för plattformens rörelse
  const moveDistance = 50; // Hur många pixlar plattformen ska röra sig

  // För varje plattform, starta en separat rörelse
  $platforms.each(function () {
    const $platform = $(this);
    let startLeft = parseInt($platform.css('left')); // Initial position
    let currentLeft = startLeft;

    // Kontrollera klass för att bestämma initial riktning
    let direction = $platform.hasClass('moving-left') ? -1 : 1;

    function movePlatform() {
      // Uppdatera plattformens position
      currentLeft += platformSpeed * direction;
      $platform.css('left', currentLeft + 'px');

      // Kontrollera om plattformen når gränsen
      if (currentLeft >= startLeft + moveDistance || currentLeft <= startLeft - moveDistance) {
        direction *= -1; // Byt riktning
      }

      requestAnimationFrame(movePlatform);
    }

    // Starta plattformsrörelsen för denna plattform
    movePlatform();
  });

  // function initLevel(level) {
  //     $('.level').hide();
  //     $(`#level${level}`).show();
  //     player = $(`#level${level} .player`);
  //     resetPlayerPosition();
  //     updateFruits();
  //     levelComplete.hide();
  //     setPlayerIdle(); // Sätt spelaren till idle när nivån starta
  //     moveBackground(); // Call the function to start the animation
  //     bgAudio.play(); // Play background music
  // }

  function initLevel(level) {
    // Slumpa en bakgrund varje gång en ny nivå startar
    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    $('#game').css('background', backgrounds[randomIndex]);

    hasLevelCompleted = false;
    controlsLocked = false; // Lås upp kontrollerna

    $('.level').hide();
    $(`#level${level}`).show();

    $('#level-display span').text(currentLevel);

    // Sätt spelaren till rätt element
    player = $(`#level${level} .player`);
    resetPlayerPosition();
    updateFruits();
    levelComplete.hide();
    setPlayerIdle();
    moveBackground(); // Call the function to start the animation
    bgAudio.play(); // Play background music

    // Visa övergången och starta spelet efteråt
    showLevelTransition(level, function() {
      if (!isGameRunning) {
        isGameRunning = true; // Förhindra att gameLoop körs flera gånger
        gameLoop();
      }
    });
  }

  function initResetLevel(level) {
    hasLevelCompleted = false;
    controlsLocked = false; // Lås upp kontrollerna
    player.show();

    // Återställ räknaren för insamlade frukter
    collectedFruits = 0;

    // Visa endast den aktuella nivån utan att ändra bakgrunden eller musik
    $(`#level${level}`).show();

    // Återställ spelarens position och status
    player = $(`#level${level} .player`);
    resetPlayerPosition();
    setPlayerIdle();

    // Återställ alla frukter så att de visas igen
    $(`#level${currentLevel} .fruit`).each(function () {
        $(this).show();
    });

    levelComplete.hide(); // Dölj rutan för nivå klar

    // Sätt igång spelet igen om det inte redan körs
    if (!isGameRunning) {
        isGameRunning = true;
        gameLoop();
    }
  }

  // function resetPlayerPosition() {
  //     player.css({ left: '50px', top: '450px' });
  //     velocityY = 0;
  //     onGround = false;
  // }

  function resetPlayerPosition() {
    const groundHeight = $('#ground').height(); // Höjden på marken
    const playerHeight = player.height(); // Höjden på spelaren
    const gameHeight = game.height(); // Höjden på spelområdet

    // Placera spelaren en bit ovanför marken
    const spawnHeight = 80; // Höjd över marken där spelaren ska spawna

    player.css({
      left: '50px',
      top: `${gameHeight - groundHeight - playerHeight - spawnHeight}px`
    });

    // Återställ spelarens riktning till höger
    currentDirection = 'right';

    velocityY = 0;
    onGround = true; // Sätt spelaren som "på marken" vid start
  }

  function updateFruits() {
    collectedFruits = 0;
    $(`#level${currentLevel} .fruit`).show();
  }

  // Ställ in spelarens bakgrundsbild beroende på riktning och tillstånd
  function setPlayerIdle() {
    player.css('background-image', currentDirection === 'right' ? 'url(img/char/idle-r.gif)' : 'url(img/char/idle-l.gif)');
  }

  function setPlayerRun() {
    player.css('background-image', currentDirection === 'right' ? 'url(img/char/run-r.gif)' : 'url(img/char/run-l.gif)');
  }

  function setPlayerJump() {
    player.css('background-image', currentDirection === 'right' ? 'url(img/char/jump-r.png)' : 'url(img/char/jump-l.png)');
  }

  // Detect key press
  $(document).keydown(function (e) {
    keys[e.keyCode] = true;
  });

  $(document).keyup(function (e) {
    keys[e.keyCode] = false;
    setPlayerIdle(); // Sätt till idle när tangenterna släpps
  });

  // STÖD FÖR HANDKONROLL
  let gamepadIndex = null;

  // Event när handkontrollen ansluts
  window.addEventListener("gamepadconnected", (event) => {
    console.log("Gamepad connected:", event.gamepad);
    gamepadIndex = event.gamepad.index;
  });

  // Event när handkontrollen kopplas bort
  window.addEventListener("gamepaddisconnected", () => {
    console.log("Gamepad disconnected");
    gamepadIndex = null;
  });

  // function handleGamepadInput() {
  //   const gamepad = navigator.getGamepads()[gamepadIndex];
  //   if (!gamepad) return;
  //
  //   // Styrspak och hopp
  //   const horizontalAxis = gamepad.axes[0]; // Vänster styrspak, horisontell axel
  //   const jumpButton = gamepad.buttons[0].pressed; // A-knappen (eller motsvarande)
  //
  //   let isMoving = false;
  //
  //   // Rörelse åt vänster
  //   if (horizontalAxis < -0.5) {
  //     currentDirection = 'left';
  //     setPlayerRun();
  //     player.css('left', Math.max(parseInt(player.css('left')) - playerSpeed, 0));
  //     isMoving = true;
  //   }
  //
  //   // Rörelse åt höger
  //   if (horizontalAxis > 0.5) {
  //     currentDirection = 'right';
  //     setPlayerRun();
  //     player.css('left', Math.min(parseInt(player.css('left')) + playerSpeed, game.width() - player.width()));
  //     isMoving = true;
  //   }
  //
  //   // Hopp
  //   if (jumpButton && onGround) {
  //     setPlayerJump();
  //     velocityY = -jumpPower;
  //     onGround = false;
  //     isMoving = true;
  //     jumpAudio.currentTime = 0; // Spela upp från början om ljudet redan
  //     jumpAudio.play();
  //   }
  //
  //   // Sätt spelaren i idle-läge om ingen input registreras
  //   if (!isMoving) {
  //     setPlayerIdle();
  //   }
  //
  //   // Hantera knappar för att starta om och gå till nästa nivå
  //   const restartButton = gamepad.buttons[9].pressed; // Start-knappen
  //   const nextLevelButton = gamepad.buttons[8].pressed; // Select-knappen
  //
  //   // Starta om nivån när Start-knappen trycks
  //   if (restartButton) {
  //     restartLevel();
  //   }
  //
  //   // Gå till nästa nivå endast om rutan #levelComplete är synlig
  //   if (nextLevelButton && $('#levelComplete').is(':visible')) {
  //     goToNextLevel();
  //   }
  // }

  function handleGamepadInput() {
    const gamepad = navigator.getGamepads()[gamepadIndex];
    if (!gamepad) return;

    const horizontalAxis = gamepad.axes[0];
    const jumpButton = gamepad.buttons[0].pressed; // A-knappen
    const bButton = gamepad.buttons[1].pressed; // B-knappen
    const startButton = gamepad.buttons[9].pressed; // Start-knappen
    const restartButton = gamepad.buttons[8].pressed; // Select-knappen
    const nextLevelButton = gamepad.buttons[2].pressed; // X-knappen
    const specialMoveButton = gamepad.buttons[3].pressed; // Y-knappen

    // Styrkors (D-pad) knappar för sidledsrörelse
    const dpadLeft = gamepad.buttons[14].pressed;
    const dpadRight = gamepad.buttons[15].pressed;

    // Hantera "Gå till nästa nivå" även om kontrollerna är låsta
    if (nextLevelButton && $('#levelComplete').is(':visible')) {
      goToNextLevel();
      return;
    }

    // Hantera "ladda om sidan" även om kontrollerna är låsta
    if (bButton && $('#allLevelsComplete').is(':visible')) {
      location.reload();
      return;
    }

    // Om kontrollerna är låsta, avbryt här (förutom för Select-knappen ovan)
    if (controlsLocked) return;

    let isMoving = false;

    // Starta om nivån när Start-knappen trycks
    if (restartButton) {
      restartLevel();
    }

    // Rörelse åt vänster
    if (horizontalAxis < -0.5 || dpadLeft) {
      currentDirection = 'left';
      setPlayerRun();
      player.css('left', Math.max(parseInt(player.css('left')) - playerSpeed, 0));
      isMoving = true;
    }

    // Rörelse åt höger
    if (horizontalAxis > 0.5 || dpadRight) {
      currentDirection = 'right';
      setPlayerRun();
      player.css('left', Math.min(parseInt(player.css('left')) + playerSpeed, game.width() - player.width()));
      isMoving = true;
    }

    // Hopp
    if (jumpButton && onGround) {
      setPlayerJump();
      velocityY = -jumpPower;
      onGround = false;
      isMoving = true;
      jumpAudio.currentTime = 0; // Spela upp från början om ljudet redan
      jumpAudio.play();
    }

    // Sätt spelaren i idle-läge om ingen input registreras
    if (!isMoving) {
      setPlayerIdle();
    }
  }

  // Touch controls
  //////////////////////////////////////////////////////////////////////////////////////////////
  var isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  $('body').on('contextmenu', function(e) {
    e.preventDefault();  // Disable right-click for all elements in the body
  });

  if (/iPad/i.test(navigator.userAgent)) {
    // Scale up the div if the device is an iPad
    //$('body').css('transform', 'scale(1.7)');

    // Scale up the body content and adjust the background size
    $('body').css({
        'transform': 'scale(1.7)',
        'transform-origin': 'center center', // Optional, scales from the center
        'background-size': '97%' // Adjust the background size to match the scale
    });
  }

  if (isMobile) {
    let fadeTimeout;
    const fadeDelay = 4000; // Millisekunder innan kontrollerna försvinner

    function resetFadeTimer() {
      clearTimeout(fadeTimeout);
      $('#touch-controls').removeClass('hidden'); // Visa kontroller

      fadeTimeout = setTimeout(() => {
        $('#touch-controls').addClass('hidden'); // Göm kontroller efter inaktivitet
      }, fadeDelay);
    }

    // Starta fade-timer när dokumentet laddats
    resetFadeTimer();

    // Återställ fade-timer vid touch
    $(document).on('touchstart', function () {
      resetFadeTimer();
    });

    $('#leftButton, #rightButton, #jumpButton').show();
  } else {
    $('#leftButton, #rightButton, #jumpButton').hide();
  }

  // Variabler för att spåra rörelse
  let isMovingLeft = false;
  let isMovingRight = false;

  // Touchstart-hanterare
  $('#jumpButton').on('touchstart', function () {
    // Hopp (bara om på marken)
    if (onGround) {
      jumpAudio.currentTime = 0; // Spela upp från början om ljudet redan spelas
      jumpAudio.play();
      setPlayerJump();
      gravity = 0.1;
      jumpPower = 5;
      velocityY = -jumpPower;
      onGround = false;
    }
  });

  $('#leftButton').on('touchstart', function () {
    isMovingLeft = true; // Aktivera vänster rörelse
    currentDirection = 'left';
    setPlayerRun();
  });

  $('#rightButton').on('touchstart', function () {
    isMovingRight = true; // Aktivera höger rörelse
    currentDirection = 'right';
    setPlayerRun();
  });

  // Touchend-hanterare
  $('#jumpButton, #leftButton, #rightButton').on('touchend', function () {
    // Inaktivera rörelse när knappen släpps
    if ($(this).is('#leftButton')) {
      isMovingLeft = false;
    }
    if ($(this).is('#rightButton')) {
      isMovingRight = false;
    }

    // Om inga rörelseknappar är aktiva, sätt till idle
    if (!isMovingLeft && !isMovingRight) {
      setPlayerIdle();
    }
  });

  // Uppdatera spelarens position i gameloopen
  function updatePlayerPosition() {
    if (isMovingLeft) {
      player.css('left', Math.max(parseInt(player.css('left')) - 1.3, 0));
    }
    if (isMovingRight) {
      player.css('left', Math.min(parseInt(player.css('left')) + 1.8, game.width() - player.width()));
    }
  }

  // GAMELOOP BÖRJAR
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  function gameLoop() {
    if (!player.length) return;

    // Hantera input från handkontrollen oavsett om kontrollerna är låsta
    handleGamepadInput();

    updatePlayerPosition();

    // Hantera tangentbordskontroller och spelarrörelse endast om kontrollerna är upplåsta
    if (!controlsLocked) {
      // Rörelse åt vänster och höger
      if (keys[37] || keys[65]) { // Vänster piltangent eller A
        currentDirection = 'left';
        setPlayerRun();
        player.css('left', Math.max(parseInt(player.css('left')) - playerSpeed, 0));
      }
      if (keys[39] || keys[68]) { // Höger piltangent eller D
        currentDirection = 'right';
        setPlayerRun();
        player.css('left', Math.min(parseInt(player.css('left')) + playerSpeed, game.width() - player.width()));
      }

      // Hopp (bara om på marken)
      if ((keys[38] || keys[87]) && onGround) {
        jumpAudio.currentTime = 0; // Spela upp från början om ljudet redan
        jumpAudio.play();
        setPlayerJump();
        velocityY = -jumpPower;
        onGround = false;
      }
    }

    // // Gravitation
    // velocityY += gravity;
    // player.css('top', Math.min(parseInt(player.css('top')) + velocityY, game.height() - player.height()));
    //
    // // Kontrollera om spelaren är på marken
    // if (parseInt(player.css('top')) >= game.height() - player.height()) {
    //     onGround = true;
    //     velocityY = 0;
    // }

    // Gravitation
    velocityY += gravity;
    let newTop = parseInt(player.css('top')) + velocityY;

    // Kontrollera om spelaren är på marken
    const groundTop = game.height() - $('#ground').height();
    if (newTop + player.height() > groundTop) {
      newTop = groundTop - player.height();
      onGround = true;
      velocityY = 0;
    }

    player.css('top', newTop);

    $(`#level${currentLevel} .trap`).each(function () {
      const spike = $(this);
      const spikeTop = spike.position().top;
      const spikeLeft = spike.position().left;
      const spikeRight = spikeLeft + spike.width();
      const spikeBottom = spikeTop + spike.height();

      const playerTop = parseInt(player.css('top'));
      const playerBottom = playerTop + player.height();
      const playerLeft = parseInt(player.css('left'));
      const playerRight = playerLeft + player.width();

      // Kontrollera kollision mellan spelaren och hindret
      if (playerBottom > spikeTop && playerTop < spikeBottom &&
        playerRight > spikeLeft && playerLeft < spikeRight) {
        if (!levelRestarted) {
          levelRestarted = true; // Förhindra flera återställningar
          restartLevel();
        }
      }
    });


    // Kontrollera kollision med plattformar
    // $(`#level${currentLevel} .platform`).each(function () {
    //   const platform = $(this);
    //   if (collision(player, platform) && velocityY >= 0) {
    //     onGround = true;
    //     velocityY = 0;
    //     player.css('top', platform.position().top - player.height());
    //   }
    // });

    $(`#level${currentLevel} .platform`).each(function () {
      const platform = $(this);
      const platformTop = platform.position().top;
      const platformLeft = platform.position().left;
      const platformRight = platformLeft + platform.width();
      const platformBottom = platformTop + platform.height();

      const playerTop = parseInt(player.css('top'));
      const playerBottom = playerTop + player.height();
      const playerLeft = parseInt(player.css('left'));
      const playerRight = playerLeft + player.width();

      const isFalling = velocityY > 0;
      const isJumping = velocityY < 0;

      // Kontrollera om spelaren landar på plattformen
      if (isFalling && playerBottom >= platformTop && playerBottom <= platformTop + 10 &&
        playerRight > platformLeft && playerLeft < platformRight) {
        // Spelaren landar på plattformen
        onGround = true;
        velocityY = 0;
        player.css('top', platformTop - player.height());
      }

      // Förhindra att spelaren hoppar genom plattformen underifrån
      else if (isJumping && playerTop <= platformBottom && playerBottom > platformTop &&
        playerRight > platformLeft && playerLeft < platformRight) {
        // Stoppa uppåtgående rörelse när spelaren träffar plattformens undersida
        velocityY = 0;
        player.css('top', platformBottom);
      }

      // Förhindra att spelaren går igenom plattformen från vänster
      else if (playerRight > platformLeft && playerRight < platformLeft + 10 &&
        playerBottom > platformTop && playerTop < platformBottom) {
        player.css('left', platformLeft - player.width());
      }

      // Förhindra att spelaren går igenom plattformen från höger
      else if (playerLeft < platformRight && playerLeft > platformRight - 10 &&
        playerBottom > platformTop && playerTop < platformBottom) {
        player.css('left', platformRight);
      }
    });

    // $(`#level${currentLevel} .fruit`).each(function () {
    //     const fruit = $(this);
    //     if (collision(player, fruit) && fruit.is(':visible')) {
    //         fruit.hide();
    //         collectedFruits++;
    //         biteAudio.play();
    //     }
    // });

    $(`#level${currentLevel} .fruit`).each(function () {
      const fruit = $(this);
      if (collision(player, fruit) && fruit.is(':visible')) {
        const fruitPosition = fruit.position(); // Hämta fruktens position
        fruit.hide(); // Dölj frukten
        collectedFruits++;
        biteAudio.play();

        // Skapa ett nytt element för GIF
        const gifElement = $('<div class="fruit-gif"></div>');
        gifElement.css({
          position: 'absolute',
          top: fruitPosition.top,
          left: fruitPosition.left,
          width: fruit.width(),
          height: fruit.height(),
          backgroundImage: 'url("img/fruits/collected.gif")', // Ersätt med sökvägen till din GIF
          backgroundSize: 'cover'
        });

        // Lägg till GIF-elementet i spelområdet och visa det efter 1 sekund
        $('#game').append(gifElement);
        setTimeout(() => {
          gifElement.show(); // Visa GIF:en efter 1 sekund
          setTimeout(() => gifElement.remove(), 150); // Ta bort GIF:en efter 1 sekund
        }, 150);
      }
    });

    // if (collectedFruits === $(`#level${currentLevel} .fruit`).length) {
    //   levelupAudio.play();
    //   levelComplete.show();
    // }

    checkLevelCompletion();

    requestAnimationFrame(gameLoop);
  }

  function restartLevel() {
    controlsLocked = true; // Lås kontrollerna

    const playerPosition = player.position(); // Hämta fruktens position
    player.hide(); // Dölj frukten

    // Skapa ett nytt element för GIF
    const gifDisElement = $('<div class="disappearing-gif"></div>');
    gifDisElement.css({
      position: 'absolute',
      top: playerPosition.top,
      left: playerPosition.left,
      width: player.width(),
      height: player.height(),
      backgroundImage: 'url("img/char/disappearing.gif")', // Ersätt med sökvägen till din GIF
      backgroundSize: 'cover'
    });

    // Lägg till GIF-elementet i spelområdet och visa det efter 1 sekund
    $('#game').append(gifDisElement);
    setTimeout(() => {
      gifDisElement.show(); // Visa GIF:en efter 1 sekund
      setTimeout(() => gifDisElement.remove(), 150); // Ta bort GIF:en efter 1 sekund
    }, 150);

    //player.addClass('shake'); // Lägg till en skak-animation

    // Spela endast upp ljudet om det inte redan spelas
    if (!isHurtSoundPlaying) {
      hurtAudio.currentTime = 0; // Starta från början
      hurtAudio.play();
      isHurtSoundPlaying = true;
    }

    // // Ta bort skak-animationen efter 300 ms
    // setTimeout(function() {
    //     player.removeClass('shake');
    // }, 300);

    // Återställ nivån efter 800 ms och lås upp kontrollerna
    setTimeout(() => {
      levelRestarted = false;
      isHurtSoundPlaying = false;
      initResetLevel(currentLevel);
    }, 800);
  }

  $('#restartBtn').click(restartLevel);

  function checkLevelCompletion() {
    if (!hasLevelCompleted && collectedFruits === $(`#level${currentLevel} .fruit`).length) {
      hasLevelCompleted = true; // Markera att nivån är avslutad
      controlsLocked = true; // Lås kontrollerna
      setPlayerIdle();
      levelupAudio.currentTime = 0;
      levelupAudio.play();
      // levelComplete.show();
      setTimeout(() => {
        levelComplete.show();
    }, 400);
    }
  }

  function collision(a, b) {
    const aPos = a.position();
    const bPos = b.position();
    return !(
      ((aPos.top + a.height()) < bPos.top) ||
      (aPos.top > (bPos.top + b.height())) ||
      ((aPos.left + a.width()) < bPos.left) ||
      (aPos.left > (bPos.left + b.width()))
    );
  }

  // $('#nextLevel').click(function () {
  //   if (currentLevel < totalLevels) {
  //     currentLevel++;
  //     initLevel(currentLevel);
  //   } else {
  //     alert('Grattis! Du har klarat alla nivåer!');
  //     location.reload();
  //   }
  // });

  $('#nextLevelBtn').click(goToNextLevel);

  // Funktion för att gå till nästa nivå eller avsluta spelet
  function goToNextLevel() {
    if (currentLevel < totalLevels) {
      currentLevel++;
      initLevel(currentLevel);
    } else if (currentLevel == totalLevels) {
      levelComplete.hide();
      $('#allLevelsComplete').show();
    } else {
      //alert('Grattis! Du har klarat alla nivåer!');
      location.reload();
    }
  }

  // nästa nivå click
  $('#nextLevel').click(goToNextLevel);

  // spela igen click
  $('#playAgain').click(function () {
    location.reload();
  });

  // Lyssna på Enter-tangenten
  $(document).keydown(function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && $('#levelComplete').is(':visible')) {
      goToNextLevel();
    }
  });

  /////////////////////////////////////////////////////////////////////////////////////////////////
  // game pad start button part
  let gameStarted = false; // Track if the game has started

  function checkGamepadStart() {
    const gamepads = navigator.getGamepads(); // Get all connected gamepads
    const gamepad = gamepads[0]; // Use the first connected gamepad

    if (gamepad && gamepad.buttons[9].pressed) { // Button index 9 is usually the Start button
      if (!gameStarted) { // Prevent multiple presses
        startGame();
      }
    }

    if (!gameStarted) {
      requestAnimationFrame(checkGamepadStart); // Keep checking until the game starts
    }
  }

  function startGame() {
    gameStarted = true;
    // Göm startskärmen och visa spelet
    $('#start-screen').fadeOut(500, function() {
      $('#game').fadeIn(500); // Visa spelet
      startScreenAudio.pause();
      initLevel(currentLevel);
      gameLoop(); // Starta game loop
    });
  }

  // Call this on page load to start listening for the Start button on gamepad
  checkGamepadStart();
  ///////////////////////////////////////////////////////////////////////////////////////////////////

  // Göm spelet från början
  $('#game').hide();

  // Spela bakgrundsmusik
  startScreenAudio.play();

  // levels button click
  $('#levels-button').click(function() {
    // Göm startskärmen och visa spelet
    $('#start-screen').fadeOut(500, function() {
      $('#levels-screen').fadeIn(500);
    });
  });

  // back button click
  $('#back-button').click(function() {
    $('#levels-screen').fadeOut(500, function() {
      $('#start-screen').fadeIn(500);
    });
  });

  // När "Starta spel"-knappen klickas
  $('#start-button').click(function() {
    // Göm startskärmen och visa spelet
    $('#start-screen').fadeOut(500, function() {
      $('#game').fadeIn(500); // Visa spelet
      startScreenAudio.pause();
      initLevel(currentLevel);
      gameLoop(); // Starta game loop
    });
  });

  // level button click
  $('.level-block').click(function () {
    // Läs av texten från knappen för att få nivån
    const selectedLevel = parseInt($(this).text(), 10); // Läser in texten och konverterar till ett nummer

    // Göm startskärmen och visa spelet
    $('#levels-screen').fadeOut(500, function () {
      $('#game').fadeIn(500); // Visa spelet
      startScreenAudio.pause(); // Pausa eventuell bakgrundsmusik på startskärmen
      currentLevel = selectedLevel;
      initLevel(currentLevel); // Initiera den valda nivån
      gameLoop(); // Starta spel-loopen
    });
  });

  // initLevel(currentLevel);
  // gameLoop();

  // för utveckling
  // $('#game').show();
  // $('#start-screen').hide();
  // initLevel(currentLevel);
  // gameLoop();
});
