// --- ऑडियो फाइल्स (जैसे थे वैसे ही) ---
const bgMusic = new Audio('audio/background.mp3');
const clockSound = new Audio('audio/clock.mp3');
const lockSound = new Audio('audio/lock.mp3');
const correctSound = new Audio('audio/correct.mp3');
const wrongSound = new Audio('audio/wrong.mp3');

let userSequence = "";
let timeLeft = 20;
let timerId;
let currentQuestion = {};
let questionsPlayed = 0; 
let currentQuestionsPool = []; // सवालों का खजाना यहाँ लोड होगा
let userPlan = 'free'; // डिफ़ॉल्ट प्लान

// --- 1. पेज लोड होते ही यूजर का प्लान चेक करना ---
window.onload = function() {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // Firebase से यूजर का डेटा लाना
            const snapshot = await firebase.database().ref('users/' + user.phoneNumber).once('value');
            const userData = snapshot.val();
            
            if (userData && userData.plan) {
                userPlan = userData.plan;
                // चेक करें कि प्लान 30 दिन से ज्यादा पुराना तो नहीं (Expiry Check)
                if (userData.expiry && new Date() > new Date(userData.expiry)) {
                    userPlan = 'free';
                }
            }
            // प्लान के हिसाब से फाइल लोड करना
            await loadQuestionsByPlan();
        } else {
            // अगर लॉगिन नहीं है तो होम पेज पर भेजें
            window.location.href = "index.html"; 
        }
    });
};

// --- 2. प्लान के हिसाब से सही JSON फाइल चुनना ---
async function loadQuestionsByPlan() {
    let fileName = ''; 
    
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_question_json'; // आपकी फाइल का नाम

    // अगर कोई प्रीमियम प्लान है तो फाइल फेच (Fetch) करें
    if (fileName !== '') {
        try {
            const response = await fetch(fileName);
            currentQuestionsPool = await response.json();
            console.log(userPlan + " के सवाल लोड हो गए हैं।");
            loadNewQuestion();
        } catch (e) {
            console.error("फाइल लोड नहीं हुई, फ्री सवाल चला रहे हैं।", e);
            currentQuestionsPool = fffQuestions; 
            loadNewQuestion();
        }
    } else {
        // फ्री यूजर के लिए question.js वाले सवाल
        currentQuestionsPool = fffQuestions;
        loadNewQuestion();
    }
}

// --- 3. नया सवाल दिखाना ---
function loadNewQuestion() {
    // फ्री यूजर के लिए 10 सवालों की लिमिट
    if (userPlan === 'free' && questionsPlayed >= 10) {
        handleLimitReached();
        return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) return;

    // पूल में से रैंडम सवाल चुनना
    const randomIndex = Math.floor(Math.random() * currentQuestionsPool.length);
    currentQuestion = currentQuestionsPool[randomIndex];
    
    // रीसेट सेटिंग्स (पुराना लॉजिक)
    userSequence = "";
    timeLeft = 20;
    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.question;
    document.getElementById('result').innerText = "";
    
    // ऑप्शंस बटन बनाना
    let optionsHTML = "";
    for (let key in currentQuestion.options) {
        optionsHTML += `<button class="option-btn" id="btn-${key}" onclick="selectOption('${key}')">
                            ${key}: ${currentQuestion.options[key]}
                        </button>`;
    }
    document.getElementById('options-container').innerHTML = optionsHTML;

    bgMusic.currentTime = 0;
    bgMusic.play();
    startTimer();
}

// --- 4. टाइमर फंक्शन ---
function startTimer() {
    clockSound.currentTime = 0;
    clockSound.play();
    timerId = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerId);
            checkSequence(); 
        }
    }, 1000);
}

// --- 5. ऑप्शन सेलेक्ट करना ---
function selectOption(key) {
    if (!userSequence.includes(key)) {
        userSequence += key;
        const btn = document.getElementById(`btn-${key}`);
        btn.style.background = "gold";
        btn.style.color = "black";
        btn.innerHTML += ` [${userSequence.length}]`;
    }
}

// --- 6. जवाब चेक करना ---
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

    questionsPlayed++;

    // अगला सवाल लोड करना
    setTimeout(() => {
        loadNewQuestion();
    }, 3500);
}

// --- 7. लिमिट खत्म होने पर मैसेज ---
function handleLimitReached() {
    const paymentLink = "https://rzp.io/rzp/I5geGyLS"; 
    const msg = "बधाई हो! आपने 10 सवालों की मुफ्त प्रैक्टिस पूरी कर ली है।\n\n" +
                "🚀 अनलिमिटेड प्रैक्टिस और हजारों सवालों के लिए अभी प्रीमियम प्लान चुनें।\n\n" +
                "पेमेंट करने के लिए 'OK' दबाएँ!";

    if (confirm(msg)) {
        window.location.href = paymentLink; 
    } else {
        window.location.href = "index.html";
    }
}
