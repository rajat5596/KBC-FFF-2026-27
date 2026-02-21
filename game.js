// --- ऑडियो फाइल्स --- (yeh wahi rakh)
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
let userName = '';

// --- 1. पेज लोड होते ही प्रीमियम चेक करो ---
window.onload = function() {
    // saved name le lo
    userName = localStorage.getItem('kbc_user') || "User";

    if (typeof firebase === 'undefined') {
        console.log("Firebase नही लोड हुआ, फ्री मोड में");
        useDefaultFreeQuestions();
        return;
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            const phone = user.phoneNumber || "+919889904191"; // fallback agar phoneNumber nahi mila
            console.log("Logged in phone:", phone);

            firebase.database().ref('users/' + phone).on('value', (snapshot) => {
                const data = snapshot.val();
                console.log("🔥 Firebase se data:", data);

                if (data && data.plan && data.plan !== 'free') {
                    const expiryDate = new Date(data.expiry);
                    if (expiryDate > new Date()) {
                        userPlan = data.plan;
                        console.log("✅ Premium Active:", userPlan);

                        // UI update
                        const welcome = document.getElementById('welcome-msg');
                        if (welcome) {
                            welcome.innerText = `स्वागत है, \( {userName} ( \){userPlan.toUpperCase()})`;
                        }

                        // Limit message hide
                        const limitMsg = document.getElementById('limit-message');
                        if (limitMsg) limitMsg.style.display = 'none';

                        // Premium questions load karo
                        loadPremiumQuestions(userPlan);
                    } else {
                        userPlan = 'free';
                        console.log("Plan expired");
                    }
                } else {
                    userPlan = 'free';
                    console.log("No premium plan");
                }

                // Har baar data update hone pe questions reload
                loadFinalQuestions();
            });
        } else {
            userPlan = 'free';
            loadFinalQuestions();
        }
    });
};

// --- 2. Premium questions load ---
async function loadPremiumQuestions(plan) {
    let fileName = '';
    if (plan === 'silver') fileName = 'silver_questions.json';
    else if (plan === 'gold') fileName = 'gold_questions.json';
    else if (plan === 'platinum') fileName = 'platinum_questions.json';

    try {
        const response = await fetch(fileName);
        if (!response.ok) throw new Error('Premium file nahi mili');
        let data = await response.json();
        currentQuestionsPool = data.sort(() => Math.random() - 0.5);
        questionsPlayed = 0; // reset limit premium ke liye
        loadNewQuestion();
        console.log("Premium questions loaded:", plan);
    } catch (e) {
        console.log("Premium load failed:", e);
        useDefaultFreeQuestions(); // fallback free pe
    }
}

// --- 3. Final questions load (premium ya free) ---
async function loadFinalQuestions() {
    if (userPlan !== 'free') {
        // Premium already loaded in loadPremiumQuestions
        return;
    }

    // Free mode
    if (typeof fffQuestions !== 'undefined' && fffQuestions.length > 0) {
        currentQuestionsPool = [...fffQuestions].sort(() => Math.random() - 0.5);
        questionsPlayed = 0;
        loadNewQuestion();
    } else {
        console.log("fffQuestions nahi mila, retrying...");
        setTimeout(loadFinalQuestions, 500);
    }
}

// --- 4. Free limit check loadNewQuestion mein ---
function loadNewQuestion() {
    if (userPlan === 'free' && questionsPlayed >= 10) {
        handleLimitReached();
        return;
    }

    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        if (userPlan === 'free') {
            useDefaultFreeQuestions();
        } else {
            alert("सारे सवाल खत्म! पेज रिफ्रेश करें।");
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

// --- baki functions (startTimer, selectOption, checkSequence, handleLimitReached) wahi rakh ---
