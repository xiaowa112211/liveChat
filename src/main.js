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

// === Notification Setup ===
let currentUser = null;
let firstLoad = true;

async function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("✅ Notification permission granted");
    }
  }
}

// အသစ်ရောက်တဲ့ မက်ဆေ့ချ်အတွက် Notification
function showNotification(sender, text) {
  if (Notification.permission === "granted") {
    const notification = new Notification("💬 KoKo And Nge", {
      body: `${sender}: ${text}`,
      icon: "/icon.png",           // သင့်ရဲ့ logo ထည့်နိုင်ရင် ကောင်းပါတယ်
      tag: "new-message",          // duplicate မဖြစ်အောင်
      requireInteraction: false
    });

    // နှိပ်ရင် chat ကို ဖွင့်ပေးမယ်
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
}

// === HTML အပိုင်း (မပြောင်းပါ) ===
document.querySelector("#app").innerHTML = `... သင့်ရဲ့ မူရင်း HTML ကို ထားပါ ...`;

// Element တွေ ရယူခြင်း
const email = document.getElementById("email");
const password = document.getElementById("password");
const msg = document.getElementById("msg");

const authScreen = document.getElementById("auth-screen");
const chatScreen = document.getElementById("chat-screen");
const userInfo = document.getElementById("user-info");
const messagesList = document.getElementById("messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const logoutBtn = document.getElementById("logout-btn");

// အကောင့်ဝင်ပြီးရင် Notification ခွင့်ပြုချက်တောင်း
function startChatRoom(user) {
  currentUser = user;
  authScreen.style.display = "none";
  chatScreen.style.display = "flex";
  
  const shortName = user.email.split("@")[0];
  userInfo.innerHTML = `<b>${shortName}</b>`;

  requestNotificationPermission();   // ← ဒီနေရာမှာ တောင်း

  const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
  
  onSnapshot(q, (snapshot) => {
    // ပထမ load တစ်ခါတည်း မက်ဆေ့ချ်တွေ အကုန်ပြဖို့
    if (firstLoad) {
      firstLoad = false;
      renderAllMessages(snapshot);
      return;
    }

    // နောက်ထပ် ရောက်လာတဲ့ မက်ဆေ့ချ်တွေအတွက်ပဲ
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data();
        
        // ကိုယ်ပို့တာ မဟုတ်ရင် notification ပြပါ
        if (data.sender !== currentUser.email) {
          showNotification(data.sender.split("@")[0], data.text);
        }

        // တစ်ခုချင်း ထည့်ပြသရန် (သို့မဟုတ် အကုန်ပြန်ဆွဲလည်း ရပါတယ်)
        renderNewMessage(data);
      }
    });
  });
}

function renderAllMessages(snapshot) {
  messagesList.innerHTML = "";
  snapshot.forEach((doc) => {
    appendMessage(doc.data());
  });
  scrollToBottom();
}

function renderNewMessage(data) {
  appendMessage(data);
  scrollToBottom();
}

function appendMessage(data) {
  const messageWrapper = document.createElement("div");
  messageWrapper.className = "message-row";
  
  if (data.sender === currentUser.email) {
    messageWrapper.classList.add("me");
  } else {
    messageWrapper.classList.add("others");
    const senderName = document.createElement("span");
    senderName.className = "sender-name";
    senderName.innerText = data.sender.split("@")[0];
    messageWrapper.appendChild(senderName);
  }

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.innerText = data.text;
  messageWrapper.appendChild(bubble);

  // Timestamp
  const timeSpan = document.createElement("span");
  timeSpan.className = "message-time";
  const date = data.createdAt ? data.createdAt.toDate() : new Date();
  timeSpan.innerText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  messageWrapper.appendChild(timeSpan);

  messagesList.appendChild(messageWrapper);
}

function scrollToBottom() {
  const chatBox = document.getElementById("chat-box");
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send Message
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
    console.error("စာပို့မရပါ:", e);
  }
}

// Event Listeners
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
    setTimeout(() => startChatRoom(userCredential.user), 800);
  } catch (e) {
    msg.innerHTML = "❌ အမှား: " + e.message;
  }
};

document.getElementById("login").onclick = async () => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
    msg.innerHTML = "✅ အကောင့်ဝင်ခြင်း အောင်မြင်သည်";
    setTimeout(() => startChatRoom(userCredential.user), 800);
  } catch (e) {
    msg.innerHTML = "❌ အမှား: " + e.message;
  }
};

logoutBtn.onclick = async () => {
  await signOut(auth);
  chatScreen.style.display = "none";
  authScreen.style.display = "block";
  firstLoad = true;
};

// ပထမ load တွင် အကောင့်ရှိနေရင် တိုက်ရိုက်ဝင်ပါ
auth.onAuthStateChanged((user) => {
  if (user) {
    startChatRoom(user);
  }
});