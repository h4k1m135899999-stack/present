// ===== Estado global =====
const appStartTime = Date.now();
let secretTapCount = 0;
let secretTapTimeout = null;
const SECRET_TAPS_NEEDED = 5;
const SECRET_TAP_RESET_MS = 2500;

// ===== Perguntas do captcha (editáveis) =====
// type: 'image' → grid 2x2 com SVGs | type: 'text' → opções de texto
// correct: índice da resposta certa (0–3)
const captchaQuestions = [
  {
    type: 'image',
    question: 'Selecione a imagem que prova que você é humano:',
    images: [
      { src: 'assets/captcha/q1-1.svg' },
      { src: 'assets/captcha/q1-2.svg' },
      { src: 'assets/captcha/q1-3.svg' },
      { src: 'assets/captcha/q1-4.svg' }
    ],
    correct: 0
  },
  {
    type: 'image',
    question: 'Qual dessas NÃO é um robô disfarçado?',
    images: [
      { src: 'assets/captcha/q2-1.svg' },
      { src: 'assets/captcha/q2-2.svg' },
      { src: 'assets/captcha/q2-3.svg' },
      { src: 'assets/captcha/q2-4.svg' }
    ],
    correct: 1
  },
  {
    type: 'text',
    question: "Complete: 'Eu sou humano porque...'",
    options: [
      'Passo horas no TikTok',
      'Esqueço por que entrei na cozinha',
      'Tenho crise existencial às 3h da manhã',
      'Todas as anteriores'
    ],
    correct: 3
  }
];

const ageQuestions = [
  {
    question: 'Você já mentiu sobre sua idade?',
    options: ['Nunca', 'Só no boliche', 'Só pro Netflix', 'Pro meu dentista'],
    correct: 0
  },
  {
    question: 'Qual a idade mental de quem está lendo isso?',
    options: ['5 anos', '17 anos', '42 anos', 'Indefinida'],
    correct: 3
  },
  {
    question: 'Confirme: você é velho o suficiente pra entender piadas ruins?',
    options: ['Sim', 'Não', 'Sou velho demais', 'O que é piada?'],
    correct: 0
  }
];

// ===== Navegação =====
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active', 'exit', 'entering');
  });

  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('entering');
    requestAnimationFrame(() => {
      target.classList.add('active');
      target.classList.remove('entering');
    });
  }
}

function transitionTo(fromId, toId, delay = 500)   {
  const from = document.getElementById(fromId);
  if (from) from.classList.add('exit');

  setTimeout(() => showScreen(toId), delay);
}

// ===== Formatar tempo =====
function formatWaitTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds} segundo${totalSeconds !== 1 ? 's' : ''}`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 60) {
    let text = `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    if (seconds > 0) {
      text += ` e ${seconds} segundo${seconds !== 1 ? 's' : ''}`;
    }
    return text;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  let text = `${hours} hora${hours !== 1 ? 's' : ''}`;
  if (remainingMinutes > 0) {
    text += ` e ${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''}`;
  }
  return text;
}

// ===== Feedback do captcha =====
function showCaptchaFeedback(el, message, type) {
  el.textContent = message;
  el.className = `captcha-feedback captcha-feedback--${type}`;
}

function hideCaptchaFeedback(el) {
  el.className = 'captcha-feedback hidden';
  el.textContent = '';
}

// ===== Captcha (com lógica anti-primeira-tentativa) =====
function initCaptchaQuiz(questions, questionEl, optionsEl, progressEl, feedbackEl, onComplete) {
  let current = 0;

  function nextQuestion() {
    current++;
    hideCaptchaFeedback(feedbackEl);
    if (current >= questions.length) {
      onComplete();
    } else {
      render();
    }
  }

  function renderImageQuestion(q) {
    optionsEl.className = 'options options-image';
    let hasFailed = false;

    q.images.forEach((img, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'image-option';
      btn.innerHTML = `<img src="${img.src}" alt="" draggable="false">`;

      btn.addEventListener('click', () => {
        if (btn.classList.contains('correct')) return;

        if (i === q.correct) {
          if (!hasFailed) {
            btn.classList.add('suspicious');
            showCaptchaFeedback(feedbackEl, 'Um humano não acertaria de primeira.', 'suspicious');
            setTimeout(() => btn.classList.remove('suspicious'), 700);
          } else {
            optionsEl.querySelectorAll('.image-option').forEach(b => (b.disabled = true));
            btn.classList.add('correct');
            showCaptchaFeedback(feedbackEl, 'Hmm... ok, passou.', 'success');
            setTimeout(nextQuestion, 900);
          }
        } else {
          hasFailed = true;
          btn.classList.add('wrong');
          showCaptchaFeedback(feedbackEl, 'Errou, tenta mais.', 'wrong');
          setTimeout(() => btn.classList.remove('wrong'), 650);
        }
      });

      optionsEl.appendChild(btn);
    });
  }

  function renderTextQuestion(q) {
    optionsEl.className = 'options';

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = opt;

      btn.addEventListener('click', () => {
        const buttons = optionsEl.querySelectorAll('.option-btn');
        buttons.forEach(b => (b.disabled = true));

        if (i === q.correct) {
          btn.classList.add('correct');
          setTimeout(nextQuestion, 600);
        } else {
          btn.classList.add('wrong');
          setTimeout(() => {
            buttons.forEach(b => {
              b.disabled = false;
              b.classList.remove('wrong');
            });
          }, 800);
        }
      });

      optionsEl.appendChild(btn);
    });
  }

  function render() {
    const q = questions[current];
    questionEl.textContent = q.question;
    progressEl.textContent = `${current + 1} de ${questions.length}`;
    optionsEl.innerHTML = '';
    hideCaptchaFeedback(feedbackEl);

    if (q.type === 'image') {
      renderImageQuestion(q);
    } else {
      renderTextQuestion(q);
    }
  }

  render();
}

// ===== Quiz de idade (texto simples) =====
function initQuiz(questions, questionEl, optionsEl, progressEl, onComplete) {
  let current = 0;

  function render() {
    const q = questions[current];
    questionEl.textContent = q.question;
    progressEl.textContent = `${current + 1} de ${questions.length}`;
    optionsEl.innerHTML = '';
    optionsEl.className = 'options';

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => handleAnswer(btn, i));
      optionsEl.appendChild(btn);
    });
  }

  function handleAnswer(btn, index) {
    const q = questions[current];
    const buttons = optionsEl.querySelectorAll('.option-btn');
    buttons.forEach(b => (b.disabled = true));

    if (index === q.correct) {
      btn.classList.add('correct');
      setTimeout(() => {
        current++;
        if (current >= questions.length) {
          onComplete();
        } else {
          render();
        }
      }, 600);
    } else {
      btn.classList.add('wrong');
      setTimeout(() => {
        buttons.forEach(b => {
          b.disabled = false;
          b.classList.remove('wrong');
        });
      }, 800);
    }
  }

  render();
}

// ===== Mini Game =====
let gameInterval = null;
let gameTimer = null;
let gameScore = 0;
const GAME_TARGET = 10;
const GAME_TIME = 30;

function startGame() {
  const area = document.getElementById('game-area');
  const scoreEl = document.getElementById('game-score');
  const timerEl = document.getElementById('game-timer');
  const nextBtn = document.getElementById('btn-game-next');

  gameScore = 0;
  let timeLeft = GAME_TIME;
  area.innerHTML = '';
  nextBtn.classList.add('hidden');
  scoreEl.textContent = `0 / ${GAME_TARGET}`;
  timerEl.textContent = `${timeLeft}s`;

  clearInterval(gameInterval);
  clearInterval(gameTimer);

  gameTimer = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `${timeLeft}s`;
    if (timeLeft <= 0) endGame(false);
  }, 1000);

  gameInterval = setInterval(spawnHeart, 800);
  spawnHeart();
}

function spawnHeart() {
  const area = document.getElementById('game-area');
  if (area.children.length >= 6) return;

  const heart = document.createElement('span');
  heart.className = 'heart-target';
  heart.textContent = '💕';
  heart.style.left = `${Math.random() * (area.clientWidth - 40)}px`;
  heart.style.top = `${Math.random() * (area.clientHeight - 40)}px`;

  heart.addEventListener('click', () => {
    if (heart.classList.contains('clicked')) return;
    heart.classList.add('clicked');
    gameScore++;
    document.getElementById('game-score').textContent = `${gameScore} / ${GAME_TARGET}`;
    setTimeout(() => heart.remove(), 300);
    if (gameScore >= GAME_TARGET) endGame(true);
  });

  area.appendChild(heart);

  setTimeout(() => {
    if (heart.parentNode && !heart.classList.contains('clicked')) {
      heart.remove();
    }
  }, 2000);
}

function endGame(won) {
  clearInterval(gameInterval);
  clearInterval(gameTimer);

  const area = document.getElementById('game-area');
  const nextBtn = document.getElementById('btn-game-next');
  area.innerHTML = '';

  if (won) {
    area.innerHTML = '<p class="game-result game-result--win">Você conseguiu! 🎉</p>';
    nextBtn.classList.remove('hidden');
  } else {
    area.innerHTML = '<p class="game-result game-result--lose">Tempo esgotado! Tente de novo 💪</p>';
    setTimeout(startGame, 1500);
  }
}

// ===== Segredo: 5 toques em "Talvez" =====
function handleSecretTap(e) {
  e.preventDefault();
  e.stopPropagation();

  const trigger = document.getElementById('secret-trigger');
  secretTapCount++;

  trigger.classList.add('secret-word--tap');
  setTimeout(() => trigger.classList.remove('secret-word--tap'), 350);

  clearTimeout(secretTapTimeout);
  secretTapTimeout = setTimeout(() => {
    secretTapCount = 0;
    trigger.classList.remove('secret-word--progress');
  }, SECRET_TAP_RESET_MS);

  if (secretTapCount >= 2) {
    trigger.classList.add('secret-word--progress');
  }

  if (secretTapCount >= SECRET_TAPS_NEEDED) {
    secretTapCount = 0;
    clearTimeout(secretTapTimeout);
    trigger.classList.remove('secret-word--progress');
    openSecretIntro();
  }
}

function openSecretIntro() {
  const waitTime = Date.now() - appStartTime;
  document.getElementById('wait-time').textContent = formatWaitTime(waitTime);

  const intro = document.getElementById('secret-intro-content');
  intro.classList.remove('fade-out');

  transitionTo('screen-home', 'screen-secret-intro', 550);
}

function openSecretList() {
  const intro = document.getElementById('secret-intro-content');
  const listContainer = document.getElementById('secret-list-container');

  intro.classList.add('fade-out');

  setTimeout(() => {
    showScreen('screen-secret-list');
    listContainer.classList.remove('revealed');
    requestAnimationFrame(() => {
      listContainer.classList.add('revealed');
    });
  }, 700);
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-open-gift').addEventListener('click', () => {
    initCaptchaQuiz(
      captchaQuestions,
      document.getElementById('captcha-question'),
      document.getElementById('captcha-options'),
      document.getElementById('captcha-progress'),
      document.getElementById('captcha-feedback'),
      () => {
        initQuiz(
          ageQuestions,
          document.getElementById('age-question'),
          document.getElementById('age-options'),
          document.getElementById('age-progress'),
          () => {
            transitionTo('screen-age', 'screen-game');
            setTimeout(startGame, 500);
          }
        );
        transitionTo('screen-captcha', 'screen-age');
      }
    );
    transitionTo('screen-home', 'screen-captcha');
  });

  document.getElementById('secret-trigger').addEventListener('click', handleSecretTap);

  document.getElementById('btn-game-next').addEventListener('click', () => {
    transitionTo('screen-game', 'screen-reveal');
  });

  document.getElementById('btn-back-home').addEventListener('click', () => {
    document.getElementById('random-response').classList.add('hidden');
    transitionTo('screen-reveal', 'screen-home');
  });

  document.getElementById('btn-random').addEventListener('click', () => {
    document.getElementById('random-response').classList.remove('hidden');
  });

  document.getElementById('screen-secret-intro').addEventListener('click', openSecretList);
});
