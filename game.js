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

// --- 1. पेज लोड होते ही डेटा तैयार करना ---
window.onload = function() {
    // पहले चेक करो कि Firebase लोड हुआ या नहीं
    if (typeof firebase === 'undefined') {
        console.log("Firebase लोड नहीं हुआ, फ्री मोड में चल रहे हैं");
        setTimeout(() => {
            useDefaultFreeQuestions();
        }, 500);
        return;
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const snapshot = await firebase.database().ref('users/' + user.phoneNumber).once('value');
                const userData = snapshot.val();
                if (userData && userData.plan) {
                    userPlan = userData.plan;
                    if (userData.expiry && new Date() > new Date(userData.expiry)) {
                        userPlan = 'free';
                    }
                }
            } catch (error) {
                console.log("Firebase error, फ्री मोड में जा रहे हैं", error);
                userPlan = 'free';
            }
        }
        // प्लान चेक करने के बाद सवाल लोड करना
        loadFinalQuestions();
    });
};

// --- 2. सवालों को लोड और SHUFFLE करना ---
async function loadFinalQuestions() {
    let fileName = ''; 
    
    // प्रीमियम प्लान के लिए फाइल नाम
    if (userPlan === 'silver') fileName = 'silver_questions.json';
    else if (userPlan === 'gold') fileName = 'gold_questions.json';
    else if (userPlan === 'platinum') fileName = 'platinum_questions.json'; // यहाँ सही किया

    // प्रीमियम यूजर के लिए
    if (fileName !== '') {
        try {
            const response = await fetch(fileName);
            if (!response.ok) {
                throw new Error('फाइल नहीं मिली');
            }
            let data = await response.json();
            // सवालों को फेंटना
            currentQuestionsPool = data.sort(() => Math.random() - 0.5);
            loadNewQuestion();
        } catch (e) {
            console.log("प्रीमियम सवाल नहीं मिले, फ्री लोड कर रहे हैं");
            useDefaultFreeQuestions();
        }
    } else {
        // फ्री यूजर के लिए
        useDefaultFreeQuestions();
    }
}

// फ्री सवाल लोड करने का फंक्शन
function useDefaultFreeQuestions() {
    // चेक करो कि fffQuestions मौजूद है या नहीं
    if (typeof fffQuestions !== 'undefined' && fffQuestions.length > 0) {
        // फ्री सवालों को फेंटना
        currentQuestionsPool = [...fffQuestions].sort(() => Math.random() - 0.5);
        loadNewQuestion();
    } else {
        // अगर नहीं मिले तो 500ms बाद फिर कोशिश करो
        console.log("fffQuestions नहीं मिला, फिर कोशिश कर रहे हैं...");
        setTimeout(useDefaultFreeQuestions, 500);
    }
}

// --- 3. नया सवाल दिखाना ---
function loadNewQuestion() {
    // फ्री यूजर के लिए 10 सवालों की लिमिट
    if (userPlan === 'free' && questionsPlayed >= 10) {
        handleLimitReached();
        return;
    }

    // चेक करो कि सवाल बाकी हैं या नहीं
    if (!currentQuestionsPool || currentQuestionsPool.length === 0) {
        // अगर सवाल खत्म हो गए तो फिर से लोड करो
        if (userPlan === 'free') {
            useDefaultFreeQuestions();
        } else {
            alert("सारे सवाल खत्म हो गए हैं! पेज रिफ्रेश करें।");
        }
        return;
    }

    // नया सवाल लोड करो
    currentQuestion = currentQuestionsPool.shift(); 
    
    // UI अपडेट करो
    userSequence = "";
    timeLeft = 20;
    document.getElementById('timer').innerText = timeLeft;
    document.getElementById('question-text').innerText = currentQuestion.question;
    document.getElementById('result').innerText = "";
    
    // ऑप्शन बटन बनाओ
    let optionsHTML = "";
    for (let key in currentQuestion.options) {
        optionsHTML += `<button class="option-btn" id="btn-${key}" onclick="selectOption('${key}')">
                            ${key}: ${currentQuestion.options[key]}
                        </button>`;
    }
    document.getElementById('options-container').innerHTML = optionsHTML;

    // बैकग्राउंड म्यूजिक चलाओ
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.log("ऑडियो नहीं चल सका:", e));
    
    // टाइमर शुरू करो
    startTimer();
}

// --- टाइमर शुरू करना ---
function startTimer() {
    if (timerId) clearInterval(timerId);
    
    clockSound.currentTime = 0;
    clockSound.play().catch(e => {});
    
    timerId = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timerId);
            checkSequence(); 
        }
    }, 1000);
}

// --- ऑप्शन सिलेक्ट करना ---
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

// --- जवाब चेक करना ---
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
    
    // अगला सवाल 3.5 सेकंड बाद
    setTimeout(loadNewQuestion, 3500);
}

// --- लिमिट खत्म होने पर ---
function handleLimitReached() {
    const paymentLink = "https://rzp.io/rzp/I5geGyLS"; 
    
    if (confirm("10 मुफ्त सवाल पूरे! आगे के लिए प्रीमियम लें?")) {
        window.location.href = paymentLink; 
    } else {
        window.location.href = "index.html";
    }
}
// ===== PREMIUM CHECK - REAL TIME (Webhook ke baad yeh kaam karega) =====
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        // user.phoneNumber se '+91' hatana zaroori hai
        const cleanPhone = user.phoneNumber.replace("+91", "").replace("+", "");
        console.log("Database mein dhoond rahe hain:", cleanPhone);

        const snapshot = await firebase.database().ref('users/' + cleanPhone).once('value');
        const userData = snapshot.val();

        if (userData) {
            console.log("Data mil gaya:", userData);
            // .trim() lagayein taaki space ki wajah se galti na ho
            userPlan = userData.plan.trim().toLowerCase(); 
            console.log("Current Plan:", userPlan);
        }
    }
    loadFinalQuestions();
});
// Firebase Auth State Change Handler
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    // यूजर लॉगिन है
    const phoneNumber = user.phoneNumber; // "+919889904191"
    const cleanPhone = phoneNumber.replace("+91", ""); // "9889904191"
    
    console.log("✅ यूजर लॉगिन:", cleanPhone);
    
    // Firebase से डेटा लोड करें
    try {
      const snapshot = await firebase.database().ref('users/' + cleanPhone).once('value');
      const userData = snapshot.val();
      
      console.log("📦 Firebase डेटा:", userData);
      
      if (userData && userData.plan && userData.status === "active") {
        // Expiry चेक करें
        const expiryDate = new Date(userData.expiry);
        const today = new Date();
        
        if (expiryDate > today) {
          userPlan = userData.plan;
          console.log(`💎 प्रीमियम यूजर: ${userPlan}`);
          
          // UI में प्लान दिखाएं
          showUserPlan(userPlan, expiryDate);
        } else {
          console.log("⚠️ प्लान एक्सपायर हो गया");
          userPlan = 'free';
          showUserPlan('expired');
        }
      } else {
        console.log("ℹ️ फ्री यूजर (कोई प्लान नहीं)");
        userPlan = 'free';
        showUserPlan('free');
      }
    } catch (error) {
      console.error("❌ Firebase एरर:", error);
      userPlan = 'free';
    }
    
    // अगला सवाल लोड करें
    loadFinalQuestions();
  }
});

// प्लान दिखाने का फंक्शन
function showUserPlan(plan, expiryDate) {
  // प्लान दिखाने के लिए HTML एलिमेंट बनाएं (अगर नहीं है)
  let planDiv = document.getElementById('user-plan-display');
  
  if (!planDiv) {
    // एलिमेंट नहीं है तो बना दें
    planDiv = document.createElement('div');
    planDiv.id = 'user-plan-display';
    planDiv.style.position = 'fixed';
    planDiv.style.top = '10px';
    planDiv.style.right = '120px'; // Logout बटन के बगल में
    planDiv.style.padding = '8px 15px';
    planDiv.style.borderRadius = '20px';
    planDiv.style.fontWeight = 'bold';
    planDiv.style.zIndex = '1000';
    document.body.appendChild(planDiv);
  }
  
  // प्लान के हिसाब से दिखाएं
  if (plan === 'silver') {
    planDiv.style.backgroundColor = '#C0C0C0';
    planDiv.style.color = '#000';
    planDiv.innerText = '🥈 सिल्वर यूजर';
  } else if (plan === 'gold') {
    planDiv.style.backgroundColor = '#FFD700';
    planDiv.style.color = '#000';
    planDiv.innerText = '🥇 गोल्ड यूजर';
  } else if (plan === 'platinum') {
    planDiv.style.backgroundColor = '#E5E4E2';
    planDiv.style.color = '#000';
    planDiv.innerText = '💎 प्लैटिनम यूजर';
  } else if (plan === 'expired') {
    planDiv.style.backgroundColor = '#f44336';
    planDiv.style.color = '#fff';
    planDiv.innerText = '⚠️ प्लान एक्सपायर';
  } else {
    planDiv.style.backgroundColor = '#4CAF50';
    planDiv.style.color = '#fff';
    planDiv.innerText = '🎯 फ्री यूजर (10 सवाल)';
  }
  
  // Expiry date दिखाएं (अगर है तो)
  if (expiryDate && plan !== 'free' && plan !== 'expired') {
    const expirySpan = document.createElement('span');
    expirySpan.style.fontSize = '12px';
    expirySpan.style.marginLeft = '5px';
    expirySpan.style.opacity = '0.8';
    expirySpan.innerText = ` (exp: ${expiryDate.toLocaleDateString('hi-IN')})`;
    planDiv.appendChild(expirySpan);
  }
}
