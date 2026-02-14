// यूजर डेटा सेव करना
function saveUser() {
    const name = document.getElementById('username').value;
    const mobile = document.getElementById('mobile').value;
    
    if(name && mobile) {
        localStorage.setItem('kbc_user', name);
        localStorage.setItem('kbc_mobile', mobile);
        localStorage.setItem('free_left', 10); // 10 फ्री सवाल
        
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('menu-section').style.display = 'block';
        document.getElementById('welcome-msg').innerText = "स्वागत है, " + name;
    } else {
        alert("कृपया जानकारी भरें");
    }
}

// फ्री गेम शुरू करना
function startFreeGame() {
    let left = localStorage.getItem('free_left');
    if(left > 0) {
        window.location.href = "game.html";
    } else {
        alert("मुफ्त प्रैक्टिस खत्म! कृपया सब्सक्राइब करें।");
    }
}

// पेमेंट (Razorpay लिंक पर भेजने के लिए)
function buyPlan(amt) {
    alert("आपको भुगतान पेज पर भेजा जा रहा है। ₹" + amt);
    // यहाँ आप अपना Razorpay पेमेंट लिंक डाल सकते हैं
    // window.location.href = "YOUR_RAZORPAY_LINK";
}
