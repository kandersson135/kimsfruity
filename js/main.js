$(document).ready(function () {
    let currentLevel = 1;
    const totalLevels = 10;
    let player;
    const game = $('#game');
    const levelComplete = $('#levelComplete');
    let isGameRunning = false;
    let hasLevelCompleted = false;

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
    bgAudio.volume = 0.1;
    bgAudio.loop = true;
    biteAudio.volume = 0.3;
    jumpAudio.volume = 0.5;
    levelupAudio.volume = 0.3;

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
          transitionElement.fadeOut(1000, callback); // Fade out under 1 sekund och kör callback
        }, 1000);
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



    // function resetPlayerPosition() {
    //     player.css({ left: '50px', top: '450px' });
    //     velocityY = 0;
    //     onGround = false;
    // }

    function resetPlayerPosition() {
      const groundHeight = $('#ground').height(); // Höjden på marken
      const playerHeight = player.height(); // Höjden på spelaren
      const gameHeight = game.height(); // Höjden på spelområdet

      // Placera spelaren precis ovanpå marken
      player.css({
        left: '50px',
        top: `${gameHeight - groundHeight - playerHeight}px`
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

  function gameLoop() {
    if (!player.length) return;

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

    // Kontrollera kollision med plattformar
    $(`#level${currentLevel} .platform`).each(function () {
      const platform = $(this);
      if (collision(player, platform) && velocityY >= 0) {
        onGround = true;
        velocityY = 0;
        player.css('top', platform.position().top - player.height());
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
          backgroundImage: 'url("img/misc/collected.gif")', // Ersätt med sökvägen till din GIF
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

  function checkLevelCompletion() {
    if (!hasLevelCompleted && collectedFruits === $(`#level${currentLevel} .fruit`).length) {
      hasLevelCompleted = true; // Markera att nivån är avslutad
      levelupAudio.currentTime = 0;
      levelupAudio.play();
      levelComplete.show();
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

  $('#nextLevel').click(function () {
    if (currentLevel < totalLevels) {
      currentLevel++;
      initLevel(currentLevel);
    } else {
      alert('Grattis! Du har klarat alla nivåer!');
      location.reload();
    }
  });

  initLevel(currentLevel);
  gameLoop();
});
