// --- ग्लोबल वैरिएबल्स ---
let userSequence = "";
let timeLeft = 20;
let timerId;
let currentQuestion = {};
let questionsPlayed = 0; 
let currentQuestionsPool = []; 
let userPlan = 'free'; 
let userName = '';

// --- 1. पेज लोड पर प्रीमियम चेक + फ्री/प्रीमियम सवाल लोड ---
window.onload = function() {
    // नाम localStorage से ले लो
    userName = localStorage.getItem('kbc_user') || "User";

    if (typeof firebase === 'undefined') {
        console.log("Firebase नही लोड हुआ → फ्री मोड");
        useDefaultFreeQuestions();
        return;
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            const phone = user.phoneNumber || "+919889904191";
            console.log("Logged in phone:", phone);

            firebase.database().ref('users/' + phone).on('value', (snapshot) => {
                const data = snapshot.val();
                console.log("Firebase data:", data);

                let isPremium = false;
                let planName = 'free';

                if (data && data.plan && data.plan !== 'free') {
                    const expiryDate = new Date(data.expiry);
                    if (expiryDate > new Date()) {
                        isPremium = true;
                        planName = data.plan;
                        userPlan = data.plan;
                        console.log("Premium active:", userPlan);

                        // UI update
                        const welcome = document.getElementById('welcome-msg');
                        if (welcome) welcome.innerText = `स्वागत है, \( {userName} ( \){userPlan.toUpperCase()})`;

                        // Limit message hide
                        const limitMsg = document.getElementById('limit-message');
                        if (limitMsg) limitMsg.style.display = 'none';
                    }
                }

                // सवाल लोड करो
                if (isPremium) {
                    loadPremiumQuestions(planName);
                } else {
                    useDefaultFreeQuestions();
                }
            });
        } else {
            userPlan = 'free';
            useDefaultFreeQuestions();
        }
    });
};

// --- 2. प्रीमियम सवाल लोड ---
async function loadPremiumQuestions(plan) {
    let fileName = '';
    if (plan === 'silver') fileName = 'silver_questions.json';
    else if (plan === 'gold') fileName = 'gold_questions.json';
    else if (plan === 'platinum') fileName = 'platinum_questions.json';

    try {
        const response = await fetch(fileName);
        if (!response.ok) throw new Error(`File nahi mili: ${fileName}`);
        let data = await response.json();
        currentQuestionsPool = data.sort(() => Math.random() - 0.5);
        questionsPlayed = 0; // premium में लिमिट नहीं
        loadNewQuestion();
        console.log(`Loaded ${plan} questions`);
    } catch (e) {
        console.error("Premium load error:", e);
        alert("प्रीमियम सवाल लोड नहीं हो सके, फ्री मोड में जा रहे हैं");
        useDefaultFreeQuestions();
    }
}

// --- 3. फ्री सवाल लोड ---
function useDefaultFreeQuestions() {
    if (typeof fffQuestions !== 'undefined' && fffQuestions.length > 0) {
        currentQuestionsPool = [...fffQuestions].sort(() => Math.random() - 0.5);
        questionsPlayed = 0;
        loadNewQuestion();
        console.log("Free questions loaded");
    } else {
        console.log("fffQuestions nahi mila");
        alert("सवाल लोड नहीं हो सके। पेज रिफ्रेश करें।");
    }
}

// --- 4. नया सवाल लोड ---
function loadNewQuestion() {
    if (userPlan === 'free' && questionsPlayed >= 10) {
        handleLimitReached();
        return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        if (userPlan === 'free') {
            useDefaultFreeQuestions();
        } else {
            alert("सारे प्रीमियम सवाल खत्म! पेज रिफ्रेश करें।");
        }
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
        optionsHTML += `<button class="option-btn" id="btn-\( {key}" onclick="selectOption(' \){key}')">
                            ${key}: ${currentQuestion.options[key]}
                        </button>`;
    }
    document.getElementById('options-container').innerHTML = optionsHTML;

    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
    startTimer();
}

// --- बाकी फंक्शन (startTimer, selectOption, checkSequence, handleLimitReached) वही रख ---
