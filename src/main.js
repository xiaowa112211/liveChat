import "./style.css";
import { auth, db } from "./firebase";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

import {
  doc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";

document.querySelector("#app").innerHTML = `
<div class="chat-app-container">
  
  <div id="auth-screen">
    <div class="brand-logo">💦</div>
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
        <div class="avatar" id="user-avatar">U</div>
        <div class="user-status">
          <span id="user-info"></span>
          <span class="status-online">● Online</span>
        </div>
      </div>
      
      <div class="header-actions">
        <button id="theme-toggle" class="icon-btn">🌙</button>
        <button id="logout-btn">❌</button>
      </div>
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
const userAvatar = document.getElementById("user-avatar");
const chatBox = document.getElementById("chat-box");
const messagesList = document.getElementById("messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const logoutBtn = document.getElementById("logout-btn");
const themeToggleBtn = document.getElementById("theme-toggle");

let currentUser = null;
let firstLoad = true;
let unsubscribeSnapshot = null;

// --- Notification Logic ---
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

function showNotification(sender, text) {
  if (Notification.permission === "granted") {
    new Notification("💬 New Message", {
      body: `${sender}: ${text}`
    });
  }
}

// --- Dark Mode Logic ---
if (localStorage.getItem("theme") === "dark") {
  document.documentElement.classList.add("dark-mode");
  themeToggleBtn.innerText = "☀️";
}

themeToggleBtn.onclick = () => {
  document.documentElement.classList.toggle("dark-mode");
  if (document.documentElement.classList.contains("dark-mode")) {
    themeToggleBtn.innerText = "☀️";
    localStorage.setItem("theme", "dark");
  } else {
    themeToggleBtn.innerText = "🌙";
    localStorage.setItem("theme", "light");
  }
};

// --- Auth State Changed ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    startChatRoom(user);
  } else {
    authScreen.style.display = "flex";
    chatScreen.style.display = "none";
    if (unsubscribeSnapshot) unsubscribeSnapshot();
  }
});

// --- Soft Delete Message Function ---
window.deleteMessage = async (msgId) => {
  if (confirm("ဒီစာတိုကို ဖျက်ရန် သေချာပါသလား?")) {
    try {
      const msgRef = doc(db, "messages", msgId);
      await updateDoc(msgRef, {
        isDeleted: true
      });
    } catch (e) {
      console.error("စာဖျက်ရာတွင် အမှားဖြစ်သည်- ", e);
    }
  }
};

function startChatRoom(user) {
  currentUser = user;
  authScreen.style.display = "none";
  chatScreen.style.display = "flex";
  
  const shortName = user.email.split("@")[0];
  userInfo.innerHTML = `<b>${shortName}</b>`;
  userAvatar.innerText = shortName.charAt(0).toUpperCase();

  const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
  
  unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
    if (!firstLoad) {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.sender !== currentUser.email) {
            showNotification(data.sender.split("@")[0], data.text);
          }
        }
      });
    }
    
    firstLoad = false;
    messagesList.innerHTML = "";
    
    snapshot.forEach((messageDoc) => {
      const data = messageDoc.data();
      const msgId = messageDoc.id;

      // စာဖတ်ပြီးကြောင်း (Read/Seen) Update ပြုလုပ်ခြင်း
      if (!data.readBy?.includes(currentUser.email)) {
        const msgRef = doc(db, "messages", msgId);
        updateDoc(msgRef, {
          readBy: [...(data.readBy || []), currentUser.email]
        });
      }

      const messageWrapper = document.createElement("div");
      messageWrapper.className = "message-row";
      
      const li = document.createElement("div");
      li.className = "message-bubble";
      
      // ဖျက်ထားသော စာဖြစ်ပါက
      if (data.isDeleted) {
        li.innerHTML = `<i>🚫 ဤစာတိုအား ဖျက်လိုက်ပါပြီ</i>`;
        li.classList.add("deleted-msg");
      } else {
        li.innerText = data.text;
      }

      if (data.sender === currentUser.email) {
        messageWrapper.classList.add("me");

        // မိမိစာဖြစ်ပြီး ဖျက်မထားရသေးပါက Delete Button ပြသခြင်း
        if (!data.isDeleted) {
          const delBtn = document.createElement("button");
          delBtn.className = "del-btn";
          delBtn.title = "စာဖျက်ရန်";
          delBtn.innerText = "🗑️";
          delBtn.onclick = () => window.deleteMessage(msgId);
          messageWrapper.appendChild(delBtn);
        }
      } else {
        messageWrapper.classList.add("others");
        const senderName = document.createElement("span");
        senderName.className = "sender-name";
        senderName.innerText = data.sender.split("@")[0];
        messageWrapper.appendChild(senderName);
      }

      messageWrapper.appendChild(li);

      // --- စာပို့ချိန်နှင့် Seen Status (အမှန်ခြစ်) ---
      const metaContainer = document.createElement("div");
      metaContainer.className = "message-meta";

      const timeSpan = document.createElement("span");
      timeSpan.className = "message-time";
      
      let timeString = "";
      if (data.createdAt) {
        const date = data.createdAt.toDate();
        timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      timeSpan.innerText = timeString;
      metaContainer.appendChild(timeSpan);

      // မိမိပို့ထားသော စာများအတွက် Seen Status (✓/✓✓) ပြရန်
      if (data.sender === currentUser.email && !data.isDeleted) {
        const readStatusSpan = document.createElement("span");
        readStatusSpan.className = "read-status";

        const isRead = data.readBy && data.readBy.length > 1;
        readStatusSpan.innerText = isRead ? " ✓✓" : " ✓";
        if (isRead) readStatusSpan.classList.add("seen");

        metaContainer.appendChild(readStatusSpan);
      }

      messageWrapper.appendChild(metaContainer);
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
      createdAt: serverTimestamp(),
      readBy: [currentUser.email], // ပို့သူက ဖတ်ပြီးသားအဖြစ် သတ်မှတ်
      isDeleted: false
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
  } catch (e) {
    msg.innerHTML = "❌ အမှား- " + e.message;
  }
};

document.getElementById("login").onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    msg.innerHTML = "✅ အကောင့်ဝင်ခြင်း အောင်မြင်သည်";
  } catch (e) {
    msg.innerHTML = "❌ အမှား- " + e.message;
  }
};

logoutBtn.onclick = async () => {
  try {
    await signOut(auth);
    email.value = "";
    password.value = "";
    msg.innerHTML = "👋 အကောင့်ထွက်လိုက်ပါပြီ";
  } catch (e) {
    console.error("Logout Error: ", e);
  }
};
