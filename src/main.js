import "./style.css";
import { auth, db } from "./firebase";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";

import {
  doc,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";

document.querySelector("#app").innerHTML = `
<div class="chat-app-container">
  
  <div id="auth-screen">
    <div class="brand-logo">💬</div>
    <h1>KoKo And Nge</h1>
    <p class="subtitle">စကားပြောခန်းထဲဝင်ရန် အကောင့်ဝင်ပါ</p>
    
    <div class="input-group">
      <input id="email" type="email" placeholder="အီးမေးလ် (Email)">
      <input id="password" type="password" placeholder="စကားဝှက် (Password)">
    </div>
    
    <button id="login" class="btn-primary">အကောင့်ဝင်ရန် (Login)</button>
    <button id="register" class="btn-secondary">အကောင့်သစ်ဖွင့်ရန် (Register)</button>
    <p id="msg"></p>
  </div>

  <div id="chat-screen" style="display: none;">
    
    <div class="chat-header">
      <div class="user-profile">
        <div class="avatar">U</div>
        <div class="user-status">
          <span id="user-info"></span>
          <span class="status-online">● Online</span>
        </div>
      </div>
      <button id="logout-btn">ထွက်ရန်</button>
    </div>
    
    <div id="chat-box">
      <div id="messages"></div>
    </div>

    <div class="input-area">
      <input id="chat-input" type="text" placeholder="စာတိုရိုက်ပါ...">
      <button id="send-btn">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
        </svg>
      </button>
    </div>
  </div>

</div>
`;

const email = document.getElementById("email");
const password = document.getElementById("password");
const msg = document.getElementById("msg");

const authScreen = document.getElementById("auth-screen");
const chatScreen = document.getElementById("chat-screen");
const userInfo = document.getElementById("user-info");
const chatBox = document.getElementById("chat-box");
const messagesList = document.getElementById("messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const logoutBtn = document.getElementById("logout-btn");

let currentUser = null;

function startChatRoom(user) {
  currentUser = user;
  authScreen.style.display = "none";
  chatScreen.style.display = "flex";
  
  const shortName = user.email.split("@")[0];
  userInfo.innerHTML = `<b>${shortName}</b>`;

  const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
  
  onSnapshot(q, (snapshot) => {
    messagesList.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      const messageWrapper = document.createElement("div");
      messageWrapper.className = "message-row";
      
      const li = document.createElement("div");
      li.className = "message-bubble";
      
      if (data.sender === currentUser.email) {
        messageWrapper.classList.add("me");
      } else {
        messageWrapper.classList.add("others");
        const senderName = document.createElement("span");
        senderName.className = "sender-name";
        senderName.innerText = data.sender.split("@")[0];
        messageWrapper.appendChild(senderName);
      }

      li.innerText = data.text;
      messageWrapper.appendChild(li);

      // --- စာပို့တဲ့ အချိန် (Timestamp) တွက်ချက်ပြသသည့်အပိုင်း ---
      const timeSpan = document.createElement("span");
      timeSpan.className = "message-time";
      
      let timeString = "";
      if (data.createdAt) {
        const date = data.createdAt.toDate();
        // 11:30 AM ပုံစံမျိုး ပြောင်းလဲခြင်း
        timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        // Firebase ထဲ မရောက်ခင် ခေတ္တပြသရန် လက်ရှိအချိန်ယူခြင်း
        timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      timeSpan.innerText = timeString;
      messageWrapper.appendChild(timeSpan);
      // ----------------------------------------------------

      messagesList.appendChild(messageWrapper);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

async function handleSendMessage() {
  const text = chatInput.value.trim();
  if (text === "") return;

  try {
    await addDoc(collection(db, "messages"), {
      text: text,
      sender: currentUser.email,
      createdAt: serverTimestamp()
    });
    chatInput.value = "";
  } catch (e) {
    console.error("စာပို့မရပါ- ", e);
  }
}

sendBtn.onclick = handleSendMessage;
chatInput.onkeypress = (e) => {
  if (e.key === "Enter") handleSendMessage();
};

document.getElementById("register").onclick = async () => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
    await setDoc(doc(db, "users", userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: email.value,
      createdAt: new Date()
    });
    msg.innerHTML = "✅ အကောင့်ဖွင့်ခြင်း အောင်မြင်သည်";
    setTimeout(() => { startChatRoom(userCredential.user); }, 1000);
  } catch (e) {
    msg.innerHTML = "❌ အမှား- " + e.message;
  }
};

document.getElementById("login").onclick = async () => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
    msg.innerHTML = "✅ အကောင့်ဝင်ခြင်း အောင်မြင်သည်";
    setTimeout(() => { startChatRoom(userCredential.user); }, 1000);
  } catch (e) {
    msg.innerHTML = "❌ အမှား- " + e.message;
  }
};

logoutBtn.onclick = async () => {
  try {
    await signOut(auth);
    chatScreen.style.display = "none";
    authScreen.style.display = "block";
    email.value = "";
    password.value = "";
    msg.innerHTML = "👋 အကောင့်ထွက်လိုက်ပါပြီ";
  } catch (e) {
    console.error("Logout Error: ", e);
  }
};