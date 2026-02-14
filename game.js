// ऑडियो फाइल्स पाथ
const bgMusic = new Audio('audio/background.mp3');
const clockSound = new Audio('audio/clock.mp3');
const lockSound = new Audio('audio/lock.mp3');
const correctSound = new Audio('audio/correct.mp3');
const wrongSound = new Audio('audio/wrong.mp3');

let userSequence = "";
let timeLeft = 20;
let timerId;
let currentQuestion = {};
let questionsPlayed = 0; // कितने सवाल खेल लिए उसका हिसाब

window.onload = function() {
    loadNewQuestion();
};

function loadNewQuestion() {
    // 10 सवाल की लिमिट चेक (सिर्फ फ्री यूजर्स के लिए)
    if (localStorage.getItem('is_premium') !== 'true' && questionsPlayed >= 10) {
        alert("आपकी मुफ्त प्रैक्टिस सीमा (10 सवाल) समाप्त हो गई है। कृपया प्रीमियम लें!");
        window.location.href = "index.html";
        return;
    }

    // question.js से रैंडम सवाल चुनना
    const randomIndex = Math.floor(Math.random() * fffQuestions.length);
    currentQuestion = fffQuestions[randomIndex];
    
    // रीसेट सेटिंग्स
    userSequence = "";
    timeLeft = 20;
    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.question;
    document.getElementById('result').innerText = "";
    
    // ऑप्शन्स बटन बनाना
    let optionsHTML = "";
    for (let key in currentQuestion.options) {
        optionsHTML += `<button class="option-btn" id="btn-${key}" onclick="selectOption('${key}')">
                            ${key}: ${currentQuestion.options[key]}
                        </button>`;
    }
    document.getElementById('options-container').innerHTML = optionsHTML;

    // म्यूजिक रीसेट और प्ले
    bgMusic.currentTime = 0;
    bgMusic.play();
    startTimer();
}

function startTimer() {
    clockSound.currentTime = 0;
    clockSound.play();
    timerId = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerId);
            checkSequence(); // टाइम खत्म तो ऑटो चेक
        }
    }, 1000);
}

function selectOption(key) {
    if (!userSequence.includes(key)) {
        userSequence += key;
        const btn = document.getElementById(`btn-${key}`);
        btn.style.background = "gold";
        btn.style.color = "black";
        btn.innerHTML += ` [${userSequence.length}]`;
    }
}

function checkSequence() {
    clearInterval(timerId);
    bgMusic.pause();
    clockSound.pause();
    lockSound.play();

    const resultPara = document.getElementById('result');
    
    if (userSequence === currentQuestion.correct) {
        correctSound.play();
        resultPara.style.color = "#00FF00";
        resultPara.innerText = "अद्भुत! सही जवाब।";
    } else {
        wrongSound.play();
        resultPara.style.color = "#FF0000";
        resultPara.innerText = "गलत! सही क्रम: " + currentQuestion.correct;
    }

    questionsPlayed++; // सवाल गिनती बढ़ाएं

    // 3 सेकंड के इंतजार के बाद अगला सवाल अपने आप लोड होगा
    setTimeout(() => {
        loadNewQuestion();
    }, 3500);
}
// यह फंक्शन तब चलेगा जब 10 सवाल पूरे हो जाएंगे
function handleLimitReached() {
    const paymentLink = "https://rzp.io/rzp/I5geGyLS"; // आपका Razorpay लिंक
    
    // एक बेहतरीन और प्रोफेशनल मैसेज
    const msg = "बधाई हो! आपने 10 सवालों की मुफ्त प्रैक्टिस पूरी कर ली है।\n\n" +
                "🚀 अपनी प्रैक्टिस जारी रखने और 1.5 लाख+ सवालों का एक्सेस पाने के लिए अभी प्रीमियम प्लान चुनें।\n\n" +
                "✅ No Ads\n✅ Unlimited Practice\n✅ Daily New Questions\n\n" +
                "पेमेंट करने के लिए 'OK' दबाएँ और अपना पसंदीदा प्लान चुनें!";

    if (confirm(msg)) {
        // OK दबाते ही सीधा पेमेंट पेज खुलेगा
        window.location.href = paymentLink; 
    } else {
        // अगर यूजर कैंसिल करता है तो उसे वापस होम पेज पर भेज दें
        window.location.href = "index.html";
    }
}

// जहाँ सवाल चेक होते हैं, वहां इसे ऐसे बुलाएँ:
if (questionsPlayed >= 10) {
    handleLimitReached();
}
async function loadUserQuestions(userPlan) {
    let questionUrl = '';

    // प्लान के हिसाब से फाइल का रास्ता तय करें
    if (userPlan === 'platinum') questionUrl = 'platinum_mega_bank.json';
    else if (userPlan === 'gold') questionUrl = 'gold_questions.json';
    else if (userPlan === 'silver') questionUrl = 'silver_questions.json';
    else {
        console.log("Loading Free Questions");
        return allFreeQuestions; // यह आपकी questions.js से आएगा
    }

    try {
        const response = await fetch(questionUrl);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("सवालों को लोड करने में दिक्कत हुई:", error);
        return allFreeQuestions;
    }
}
