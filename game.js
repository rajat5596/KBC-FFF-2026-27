// --- ऑडियो फाइल्स ---
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
let currentQuestionsPool = []; 
let userPlan = 'free'; 

window.onload = function() {
    if (typeof firebase === 'undefined') {
        useDefaultFreeQuestions();
        return;
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // क्लीन नंबर (9889904191)
            const cleanPhone = user.phoneNumber.replace(/\D/g, '').slice(-10);
            
            try {
                const snapshot = await firebase.database().ref('users/' + cleanPhone).once('value');
                const userData = snapshot.val();
                
                if (userData && userData.status === 'active') {
                    const expiryDate = new Date(userData.expiry);
                    if (expiryDate > new Date()) {
                        userPlan = userData.plan.toLowerCase().trim();
                        const planDisplay = document.getElementById('user-plan-display');
                        if(planDisplay) planDisplay.innerHTML = `💎 ${userPlan.toUpperCase()} प्लान`;
                    }
                }
            } catch (error) { console.log("DB Error"); }
            loadFinalQuestions();
        } else {
            window.location.replace("index.html");
        }
    });
};

async function loadFinalQuestions() {
    let fileName = ''; 
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_questions.json';

    if (fileName !== '') {
        try {
            const response = await fetch(fileName + "?v=" + Date.now()); // Cache bypass
            if (!response.ok) throw new Error();
            let data = await response.json();
            currentQuestionsPool = data.sort(() => Math.random() - 0.5);
            loadNewQuestion();
        } catch (e) { useDefaultFreeQuestions(); }
    } else {
        useDefaultFreeQuestions();
    }
}
window.onload = function() {
    console.log("🚀 Game starting - loading free questions directly...");

    // सारे 10 free सवाल यहीं हैं (कोई firebase, question.js की जरूरत नहीं)
    const freeQuestions = [
        { question: "इन तिथियों को वर्ष में पहले से बाद के क्रम में लगाएं:", options: { A: "15 अगस्त", B: "26 जनवरी", C: "2 अक्टूबर", D: "14 नवंबर" }, correct: "BACD" },
        { question: "इन क्रिकेट खिलाड़ियों को उनके पदार्पण (Debut) के हिसाब से पुराने से नए क्रम में लगाएं:", options: { A: "विराट कोहली", B: "एमएस धोनी", C: "सचिन तेंदुलकर", D: "शुभमन गिल" }, correct: "CBAD" },
        { question: "इन सोशल मीडिया ऐप्स को उनकी लोकप्रियता के हिसाब से क्रम में लगाएं:", options: { A: "इंस्टाग्राम", B: "फेसबुक", C: "व्हाट्सएप", D: "यूट्यूब" }, correct: "DCBA" },
        { question: "इन रंगों को इंद्रधनुष (Rainbow) के क्रम में लगाएं (नीचे से ऊपर):", options: { A: "पीला", B: "लाल", C: "बैंगनी", D: "हरा" }, correct: "CDAB" },
        { question: "इन प्रधानमंत्रियों को उनके कार्यकाल के हिसाब से पुराने से नए क्रम में लगाएं:", options: { A: "नरेन्द्र मोदी", B: "इन्दिरा गांधी", C: "जवाहरलाल नेहरू", D: "अटल बिहारी वाजपेयी" }, correct: "CBDA" },
        { question: "इन फिल्मों को उनके रिलीज वर्ष के अनुसार पुराने से नए क्रम में लगाएं:", options: { A: "दंगल", B: "शोले", C: "लगान", D: "बाहुबली" }, correct: "BCAD" },
        { question: "इन शहरों को उनकी जनसंख्या के हिसाब से घटते क्रम (ज्यादा से कम) में लगाएं:", options: { A: "मुंबई", B: "दिल्ली", C: "बेंगलुरु", D: "चेन्नई" }, correct: "BACD" },
        { question: "इन ग्रहों को सूर्य से उनकी दूरी के बढ़ते क्रम में लगाएं:", options: { A: "पृथ्वी", B: "बुध", C: "मंगल", D: "शुक्र" }, correct: "BDAC" },
        { question: "इन केबीसी पड़ावों (Levels) को उनकी राशि के हिसाब से बढ़ते क्रम में लगाएं:", options: { A: "10,000", B: "1,60,000", C: "5,000", D: "3,20,000" }, correct: "CABD" },
        { question: "इन त्योहारों को कैलेंडर वर्ष में आने वाले क्रम में लगाएं:", options: { A: "होली", B: "दीवाली", C: "रक्षा बंधन", D: "गणेश चतुर्थी" }, correct: "ACDB" }
    ];

    currentQuestionsPool = freeQuestions.sort(() => Math.random() - 0.5);
    loadNewQuestion();

    console.log("✅ Free questions loaded! Game ready. Enjoy!");
};
function loadNewQuestion() {
    if (userPlan === 'free' && questionsPlayed >= 10) {
    // script.js वाला handleLimitReached call करो (global function है)
    if (typeof handleLimitReached === 'function') {
        handleLimitReached();
    } else {
        alert("10 मुफ्त सवाल पूरे! प्रीमियम लें।");
        window.open("https://rzp.io/rzp/I5geGyLS", '_self');
    }
    return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        alert("सारे सवाल खत्म हो गए!");
        window.location.href = "index.html";
        return;
    }

    currentQuestion = currentQuestionsPool.shift(); 
    userSequence = "";
    timeLeft = 20;
    
    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.question;
    document.getElementById('result').innerText = "";
    
    let optionsHTML = "";
    for (let key in currentQuestion.options) {
        optionsHTML += `<button class="option-btn" id="btn-${key}" onclick="selectOption('${key}')">
                            ${key}: ${currentQuestion.options[key]}
                        </button>`;
    }
    document.getElementById('options-container').innerHTML = optionsHTML;

    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
    startTimer();
}

function startTimer() {
    if (timerId) clearInterval(timerId);
    clockSound.currentTime = 0;
    clockSound.play().catch(() => {});
    timerId = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerId);
            checkSequence(); 
        }
    }, 1000);
}

function selectOption(key) {
    if (!userSequence.includes(key)) {
        userSequence += key;
        const btn = document.getElementById(`btn-${key}`);
        if(btn) {
            btn.style.background = "gold";
            btn.style.color = "black";
            btn.innerHTML += ` [${userSequence.length}]`;
        }
    }
}

function checkSequence() {
    clearInterval(timerId);
    bgMusic.pause(); clockSound.pause();
    lockSound.play().catch(() => {});

    const resultPara = document.getElementById('result');
    if (userSequence === currentQuestion.correct) {
        correctSound.play().catch(() => {});
        resultPara.style.color = "#00FF00";
        resultPara.innerText = "अद्भुत! सही जवाब।";
    } else {
        wrongSound.play().catch(() => {});
        resultPara.style.color = "#FF0000";
        resultPara.innerText = "गलत! सही क्रम: " + currentQuestion.correct;
    }
    questionsPlayed++;
    setTimeout(loadNewQuestion, 3500);
}
