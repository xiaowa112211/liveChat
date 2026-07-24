import "./style.css";[cite: 4]
import { auth, db, storage } from "./firebase"; // <-- storage ထည့်ပါ

import {
  createUserWithEmailAndPassword,[cite: 4]
  signInWithEmailAndPassword,[cite: 4]
  signOut,[cite: 4]
  onAuthStateChanged[cite: 4]
} from "firebase/auth";[cite: 4]

import {
  doc,[cite: 4]
  setDoc,[cite: 4]
  collection,[cite: 4]
  addDoc,[cite: 4]
  updateDoc,[cite: 4]
  query,[cite: 4]
  orderBy,[cite: 4]
  onSnapshot,[cite: 4]
  serverTimestamp[cite: 4]
} from "firebase/firestore";[cite: 4]

// Firebase Storage functions
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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

    <!-- Image Input & Preview Area -->
    <div id="image-preview-container" style="display: none;">
      <span id="preview-filename"></span>
      <button id="cancel-image-btn">✕</button>
    </div>

    <div class="input-area">
      <!-- ပုံရွေးရန် Button -->
      <label for="image-input" class="image-upload-btn" title="ပုံပို့ရန်">📷</label>
      <input id="image-input" type="file" accept="image/*" style="display: none;">

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

const email = document.getElementById("email");[cite: 4]
const password = document.getElementById("password");[cite: 4]
const msg = document.getElementById("msg");[cite: 4]

const authScreen = document.getElementById("auth-screen");[cite: 4]
const chatScreen = document.getElementById("chat-screen");[cite: 4]
const userInfo = document.getElementById("user-info");[cite: 4]
const userAvatar = document.getElementById("user-avatar");[cite: 4]
const chatBox = document.getElementById("chat-box");[cite: 4]
const messagesList = document.getElementById("messages");[cite: 4]
const chatInput = document.getElementById("chat-input");[cite: 4]
const sendBtn = document.getElementById("send-btn");[cite: 4]
const logoutBtn = document.getElementById("logout-btn");[cite: 4]
const themeToggleBtn = document.getElementById("theme-toggle");[cite: 4]

const imageInput = document.getElementById("image-input");
const imagePreviewContainer = document.getElementById("image-preview-container");
const previewFilename = document.getElementById("preview-filename");
const cancelImageBtn = document.getElementById("cancel-image-btn");

let currentUser = null;[cite: 4]
let firstLoad = true;[cite: 4]
let unsubscribeSnapshot = null;[cite: 4]
let selectedFile = null;

// Image Selection & Preview
imageInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    selectedFile = file;
    previewFilename.innerText = `🖼️ ${file.name}`;
    imagePreviewContainer.style.display = "flex";
  }
};

cancelImageBtn.onclick = () => {
  selectedFile = null;
  imageInput.value = "";
  imagePreviewContainer.style.display = "none";
};

// --- Notification Logic ---
if ("Notification" in window && Notification.permission !== "granted") {[cite: 4]
  Notification.requestPermission();[cite: 4]
}

function showNotification(sender, text) {[cite: 4]
  if (Notification.permission === "granted") {[cite: 4]
    new Notification("💬 New Message", {[cite: 4]
      body: `${sender}: ${text}`[cite: 4]
    });[cite: 4]
  }
}

// --- Dark Mode Logic ---
if (localStorage.getItem("theme") === "dark") {[cite: 4]
  document.documentElement.classList.add("dark-mode");[cite: 4]
  themeToggleBtn.innerText = "☀️";[cite: 4]
}

themeToggleBtn.onclick = () => {[cite: 4]
  document.documentElement.classList.toggle("dark-mode");[cite: 4]
  if (document.documentElement.classList.contains("dark-mode")) {[cite: 4]
    themeToggleBtn.innerText = "☀️";[cite: 4]
    localStorage.setItem("theme", "dark");[cite: 4]
  } else {
    themeToggleBtn.innerText = "🌙";[cite: 4]
    localStorage.setItem("theme", "light");[cite: 4]
  }
};

// --- Auth State Changed ---
onAuthStateChanged(auth, (user) => {[cite: 4]
  if (user) {[cite: 4]
    startChatRoom(user);[cite: 4]
  } else {
    authScreen.style.display = "flex";[cite: 4]
    chatScreen.style.display = "none";[cite: 4]
    if (unsubscribeSnapshot) unsubscribeSnapshot();[cite: 4]
  }
});

// --- Soft Delete Message Function ---
window.deleteMessage = async (msgId) => {[cite: 4]
  if (confirm("ဒီစာတိုကို ဖျက်ရန် သေချာပါသလား?")) {[cite: 4]
    try {
      const msgRef = doc(db, "messages", msgId);[cite: 4]
      await updateDoc(msgRef, {[cite: 4]
        isDeleted: true[cite: 4]
      });
    } catch (e) {
      console.error("စာဖျက်ရာတွင် အမှားဖြစ်သည်- ", e);[cite: 4]
    }
  }
};

function startChatRoom(user) {[cite: 4]
  currentUser = user;[cite: 4]
  authScreen.style.display = "none";[cite: 4]
  chatScreen.style.display = "flex";[cite: 4]
  
  const shortName = user.email.split("@")[0];[cite: 4]
  userInfo.innerHTML = `<b>${shortName}</b>`;[cite: 4]
  userAvatar.innerText = shortName.charAt(0).toUpperCase();[cite: 4]

  const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));[cite: 4]
  
  unsubscribeSnapshot = onSnapshot(q, (snapshot) => {[cite: 4]
    if (!firstLoad) {[cite: 4]
      snapshot.docChanges().forEach((change) => {[cite: 4]
        if (change.type === "added") {[cite: 4]
          const data = change.doc.data();[cite: 4]
          if (data.sender !== currentUser.email) {[cite: 4]
            showNotification(data.sender.split("@")[0], data.imageUrl ? "[Image]" : data.text);[cite: 4]
          }
        }
      });
    }
    
    firstLoad = false;[cite: 4]
    messagesList.innerHTML = "";[cite: 4]
    
    snapshot.forEach((messageDoc) => {[cite: 4]
      const data = messageDoc.data();[cite: 4]
      const msgId = messageDoc.id;[cite: 4]

      if (!data.readBy?.includes(currentUser.email)) {[cite: 4]
        const msgRef = doc(db, "messages", msgId);[cite: 4]
        updateDoc(msgRef, {[cite: 4]
          readBy: [...(data.readBy || []), currentUser.email][cite: 4]
        });
      }

      const messageWrapper = document.createElement("div");[cite: 4]
      messageWrapper.className = "message-row";[cite: 4]
      
      const li = document.createElement("div");[cite: 4]
      li.className = "message-bubble";[cite: 4]
      
      if (data.isDeleted) {[cite: 4]
        li.innerHTML = `<i>🚫 ဤစာတိုအား ဖျက်လိုက်ပါပြီ</i>`;[cite: 4]
        li.classList.add("deleted-msg");[cite: 4]
      } else {
        // စာပါရင် စာပြမည်
        if (data.text) {
          const textDiv = document.createElement("div");
          textDiv.innerText = data.text;
          li.appendChild(textDiv);
        }
        // ပုံပါရင် ပုံပြမည်
        if (data.imageUrl) {
          const img = document.createElement("img");
          img.src = data.imageUrl;
          img.className = "chat-media-img";
          img.alt = "Chat image";
          img.onclick = () => window.open(data.imageUrl, "_blank"); // နှိပ်ရင် ပုံအကျယ်ကြည့်ရန်
          li.appendChild(img);
        }
      }

      if (data.sender === currentUser.email) {[cite: 4]
        messageWrapper.classList.add("me");[cite: 4]

        if (!data.isDeleted) {[cite: 4]
          const delBtn = document.createElement("button");[cite: 4]
          delBtn.className = "del-btn";[cite: 4]
          delBtn.title = "စာဖျက်ရန်";[cite: 4]
          delBtn.innerText = "🗑️";[cite: 4]
          delBtn.onclick = () => window.deleteMessage(msgId);[cite: 4]
          messageWrapper.appendChild(delBtn);[cite: 4]
        }
      } else {
        messageWrapper.classList.add("others");[cite: 4]
        const senderName = document.createElement("span");[cite: 4]
        senderName.className = "sender-name";[cite: 4]
        senderName.innerText = data.sender.split("@")[0];[cite: 4]
        messageWrapper.appendChild(senderName);[cite: 4]
      }

      messageWrapper.appendChild(li);[cite: 4]

      const metaContainer = document.createElement("div");[cite: 4]
      metaContainer.className = "message-meta";[cite: 4]

      const timeSpan = document.createElement("span");[cite: 4]
      timeSpan.className = "message-time";[cite: 4]
      
      let timeString = "";[cite: 4]
      if (data.createdAt) {[cite: 4]
        const date = data.createdAt.toDate();[cite: 4]
        timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });[cite: 4]
      } else {
        timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });[cite: 4]
      }
      timeSpan.innerText = timeString;[cite: 4]
      metaContainer.appendChild(timeSpan);[cite: 4]

      if (data.sender === currentUser.email && !data.isDeleted) {[cite: 4]
        const readStatusSpan = document.createElement("span");[cite: 4]
        readStatusSpan.className = "read-status";[cite: 4]

        const isRead = data.readBy && data.readBy.length > 1;[cite: 4]
        readStatusSpan.innerText = isRead ? " ✓✓" : " ✓";[cite: 4]
        if (isRead) readStatusSpan.classList.add("seen");[cite: 4]

        metaContainer.appendChild(readStatusSpan);[cite: 4]
      }

      messageWrapper.appendChild(metaContainer);[cite: 4]
      messagesList.appendChild(messageWrapper);[cite: 4]
    });

    chatBox.scrollTop = chatBox.scrollHeight;[cite: 4]
  });
}

async function handleSendMessage() {
  const text = chatInput.value.trim();
  if (text === "" && !selectedFile) return;

  sendBtn.disabled = true;
  let imageUrl = null;

  try {
    // ပုံပါပါက Firebase Storage သို့ Upload တင်ခြင်း
    if (selectedFile) {
      const storageRef = ref(storage, `chat_images/${currentUser.uid}/${Date.now()}_${selectedFile.name}`);
      const snapshot = await uploadBytes(storageRef, selectedFile);
      imageUrl = await getDownloadURL(snapshot.ref);
    }

    // Firestore ထဲ Message Data သိမ်းခြင်း
    await addDoc(collection(db, "messages"), {
      text: text,
      imageUrl: imageUrl,
      sender: currentUser.email,
      createdAt: serverTimestamp(),
      readBy: [currentUser.email],
      isDeleted: false
    });

    // Reset Inputs
    chatInput.value = "";
    cancelImageBtn.click();
  } catch (e) {
    console.error("စာ/ပုံ ပို့မရပါ- ", e);
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.onclick = handleSendMessage;[cite: 4]
chatInput.onkeypress = (e) => {[cite: 4]
  if (e.key === "Enter") handleSendMessage();[cite: 4]
};

document.getElementById("register").onclick = async () => {[cite: 4]
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);[cite: 4]
    await setDoc(doc(db, "users", userCredential.user.uid), {[cite: 4]
      uid: userCredential.user.uid,[cite: 4]
      email: email.value,[cite: 4]
      createdAt: new Date()[cite: 4]
    });
    msg.innerHTML = "✅ အကောင့်ဖွင့်ခြင်း အောင်မြင်သည်";[cite: 4]
  } catch (e) {
    msg.innerHTML = "❌ အမှား- " + e.message;[cite: 4]
  }
};

document.getElementById("login").onclick = async () => {[cite: 4]
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);[cite: 4]
    msg.innerHTML = "✅ အကောင့်ဝင်ခြင်း အောင်မြင်သည်";[cite: 4]
  } catch (e) {
    msg.innerHTML = "❌ အမှား- " + e.message;[cite: 4]
  }
};

logoutBtn.onclick = async () => {[cite: 4]
  try {
    await signOut(auth);[cite: 4]
    email.value = "";[cite: 4]
    password.value = "";[cite: 4]
    msg.innerHTML = "👋 အကောင့်ထွက်လိုက်ပါပြီ";[cite: 4]
  } catch (e) {
    console.error("Logout Error: ", e);[cite: 4]
  }
};
