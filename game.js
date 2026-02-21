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
let userName = ''; // yeh add kiya name ke liye

// --- 1. पेज लोड होते ही डेटा तैयार करना ---
window.onload = function() {
    if (typeof firebase === 'undefined') {
        console.log("Firebase लोड नहीं हुआ, फ्री मोड में चल रहे हैं");
        setTimeout(() => {
            useDefaultFreeQuestions();
        }, 500);
        return;
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            userName = localStorage.getItem('kbc_user') || "User"; // name localStorage se le lo
            const phone = user.phoneNumber;

            firebase.database().ref('users/' + phone).on('value', (snapshot) => {
                const data = snapshot.val();
                console.log("🔥 Firebase se naya data aaya:", data);

                if (data && data.plan && data.plan !== 'free') {
                    const expiryDate = new Date(data.expiry);
                    if (expiryDate > new Date()) {
                        userPlan = data.plan;
                        console.log("✅ Premium Active:", userPlan);

                        // UI update
                        const welcome = document.getElementById('welcome-msg');
                        if (welcome) welcome.innerText = `स्वागत है, \( {userName} ( \){userPlan.toUpperCase()})`;

                        // Premium questions load
                        loadPremiumQuestions(userPlan); // yeh function define karna hai neeche

                        // Limit message hide
                        const limitMsg = document.getElementById('limit-message');
                        if (limitMsg) limitMsg.style.display = 'none';
                    } else {
                        userPlan = 'free';
                    }
                } else {
                    userPlan = 'free';
                }

                // Har baar plan check ke baad questions reload karo
                loadFinalQuestions();
            });
        } else {
            userPlan = 'free';
            loadFinalQuestions();
        }
    });
};

// --- Premium questions load karne ka function (yeh add kar) ---
async function loadPremiumQuestions(plan) {
    let fileName = '';
    if (plan === 'silver') fileName = 'silver_questions.json';
    else if (plan === 'gold') fileName = 'gold_questions.json';
    else if (plan === 'platinum') fileName = 'platinum_questions.json';

    try {
        const response = await fetch(fileName);
        if (!response.ok) throw new Error('File nahi mili');
        let data = await response.json();
        currentQuestionsPool = data.sort(() => Math.random() - 0.5);
        loadNewQuestion();
        console.log("Premium questions loaded:", plan);
    } catch (e) {
        console.log("Premium file nahi mili, free pe ja rahe hain", e);
        useDefaultFreeQuestions();
    }
}

// --- baki code wahi rakh (loadFinalQuestions, useDefaultFreeQuestions, loadNewQuestion, startTimer, etc.)
// ... (tune jo bheja tha woh sab rakh)

// --- Free limit check loadNewQuestion mein ---
function loadNewQuestion() {
    if (userPlan === 'free' && questionsPlayed >= 10) {
        handleLimitReached();
        return;
    }
    // baki code wahi
}
