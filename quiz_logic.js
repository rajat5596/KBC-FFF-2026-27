let questions = [];
let currentIdx = 0;
let timer;
let timeLeft = 20;
let selectedOption = null;

async function loadQuestions() {
    try {
        const response = await fetch('quiz_questions.json');
        questions = await response.json();
        showQuestion();
    } catch (e) {
        document.getElementById('question-text').innerText = "सवाल लोड नहीं हो पाए!";
    }
}

function showQuestion() {
    if (currentIdx >= questions.length) {
        document.getElementById('question-text').innerText = "क्विज़ समाप्त! आपने शानदार खेला।";
        document.getElementById('options-container').innerHTML = "";
        document.getElementById('lock-btn').style.display = "none";
        return;
    }

    selectedOption = null;
    timeLeft = 20;
    startTimer();

    const qData = questions[currentIdx];
    document.getElementById('question-text').innerText = qData.q;
    const container = document.getElementById('options-container');
    container.innerHTML = "";

    qData.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => {
            document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedOption = opt;
        };
        container.appendChild(btn);
    });
}

function startTimer() {
    clearInterval(timer);
    document.getElementById('timer').innerText = timeLeft;
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            currentIdx++;
            showQuestion();
        }
    }, 1000);
}

function checkAnswer() {
    if (!selectedOption) return alert("कृपया एक उत्तर चुनें!");
    
    clearInterval(timer);
    const correct = questions[currentIdx].a;
    const btns = document.querySelectorAll('.option-btn');
    
    btns.forEach(btn => {
        if (btn.innerText === correct) btn.classList.add('correct');
        else if (btn.innerText === selectedOption) btn.classList.add('wrong');
        btn.disabled = true;
    });

    setTimeout(() => {
        currentIdx++;
        showQuestion();
    }, 2000);
}

loadQuestions();
