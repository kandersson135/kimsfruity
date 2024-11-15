$(document).ready(function () {
  let currentLevel = 1;
  const totalLevels = 20;
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

  let bgAudio = new Audio('audio/bg.ogg');
  let jumpAudio = new Audio('audio/jump.ogg');
  let biteAudio = new Audio('audio/bite.wav');
  let levelupAudio = new Audio('audio/levelup.mp3');
  let hurtAudio = new Audio('audio/fail.wav');
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

    // Placera spelaren precis ovanpå marken
    player.css({
      left: '50px',
      top: `${gameHeight - groundHeight - playerHeight - spawnHeight}px`
    });

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
    player.css('background-image', currentDirection === 'right' ? 'url(img/char/jump-r.gif)' : 'url(img/char/jump-l.gif)');
  }

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

  function handleGamepadInput() {
    const gamepad = navigator.getGamepads()[gamepadIndex];
    if (!gamepad) return;

    // Styrspak och hopp
    const horizontalAxis = gamepad.axes[0]; // Vänster styrspak, horisontell axel
    const jumpButton = gamepad.buttons[0].pressed; // A-knappen (eller motsvarande)

    let isMoving = false;

    // Rörelse åt vänster
    if (horizontalAxis < -0.5) {
      currentDirection = 'left';
      setPlayerRun();
      player.css('left', Math.max(parseInt(player.css('left')) - playerSpeed, 0));
      isMoving = true;
    }

    // Rörelse åt höger
    if (horizontalAxis > 0.5) {
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

    // Hantera knappar för att starta om och gå till nästa nivå
    const restartButton = gamepad.buttons[9].pressed; // Start-knappen
    const nextLevelButton = gamepad.buttons[8].pressed; // Select-knappen

    // Starta om nivån när Start-knappen trycks
    if (restartButton) {
      restartLevel();
    }

    // Gå till nästa nivå endast om rutan #levelComplete är synlig
    if (nextLevelButton && $('#levelComplete').is(':visible')) {
      goToNextLevel();
    }
  }

  // GAMELOOP BÖRJAR
  function gameLoop() {
    if (!player.length) return;

    if (!controlsLocked) {

      // Hantera input från tangentbordet och handkontrollen
      handleGamepadInput();

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

    player.addClass('shake'); // Lägg till en skak-animation

    // Spela endast upp ljudet om det inte redan spelas
    if (!isHurtSoundPlaying) {
        hurtAudio.currentTime = 0; // Starta från början
        hurtAudio.play();
        isHurtSoundPlaying = true;
    }

    // Ta bort skak-animationen efter 300 ms
    setTimeout(function() {
        player.removeClass('shake');
    }, 300);

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

  // Använd click-event för knappen
  $('#nextLevel').click(goToNextLevel);

  // Använd click-event för knappen
  $('#playAgain').click(function () {
    location.reload();
  });

  // Lyssna på Enter-tangenten
  $(document).keydown(function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && $('#levelComplete').is(':visible')) {
      goToNextLevel();
    }
  });

  initLevel(currentLevel);
  gameLoop();
});
