/*
  JARVIS
  Front-end AI assistant

  IMPORTANT:
  Do NOT put a private API key in this file.

  The website expects a backend endpoint at:

      /api/chat

  The backend should receive:

      {
        "messages": [
          {
            "role": "user",
            "content": "Hello Jarvis"
          }
        ]
      }

  and return:

      {
        "reply": "Hello. How can I help?"
      }
*/

const API_ENDPOINT = "/api/chat";

const SYSTEM_PROMPT = `
You are JARVIS, a highly capable personal AI assistant.

Your goals are:
- Be intelligent and useful.
- Give accurate answers.
- Explain difficult concepts clearly.
- Help with programming, writing, research, mathematics,
  planning, analysis and everyday tasks.
- Maintain conversational context.
- Do not pretend you performed an action when you did not.
- If you do not know something, say so.
- Follow the user's legitimate instructions carefully.
- Keep answers appropriately detailed for the question.

You are the user's personal assistant and your name is JARVIS.
`;

const state = {
  messages: [],
  files: [],
  chats: JSON.parse(localStorage.getItem("jarvisChats") || "[]")
};

const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const messagesElement = document.getElementById("messages");
const welcomeElement = document.getElementById("welcome");
const fileInput = document.getElementById("fileInput");
const filePreview = document.getElementById("filePreview");
const attachButton = document.getElementById("attachButton");
const newChatButton = document.getElementById("newChat");
const clearChatsButton = document.getElementById("clearChats");
const conversationList = document.getElementById("conversationList");
const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");

function saveChats() {
  localStorage.setItem(
    "jarvisChats",
    JSON.stringify(state.chats)
  );
}

function createId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2);
}

function addMessage(role, content) {

  state.messages.push({
    role,
    content
  });

  renderMessages();
}

function renderMessages() {

  if (state.messages.length === 0) {
    welcomeElement.style.display = "flex";
    messagesElement.innerHTML = "";
    return;
  }

  welcomeElement.style.display = "none";
  messagesElement.innerHTML = "";

  for (const message of state.messages) {

    const wrapper = document.createElement("div");
    wrapper.className =
      "message " +
      (message.role === "user" ? "user" : "assistant");

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent =
      message.role === "user" ? "U" : "J";

    const content = document.createElement("div");
    content.className = "message-content";
    content.textContent = message.content;

    wrapper.appendChild(avatar);
    wrapper.appendChild(content);

    messagesElement.appendChild(wrapper);
  }

  scrollToBottom();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    const area = document.getElementById("chatArea");
    area.scrollTop = area.scrollHeight;
  });
}

function addTypingIndicator() {

  const wrapper = document.createElement("div");
  wrapper.id = "typing";
  wrapper.className = "message assistant";

  wrapper.innerHTML = `
    <div class="avatar">J</div>
    <div class="message-content typing">
      Jarvis is thinking
    </div>
  `;

  messagesElement.appendChild(wrapper);

  scrollToBottom();
}

function removeTypingIndicator() {

  const typing = document.getElementById("typing");

  if (typing) {
    typing.remove();
  }
}

async function sendMessage() {

  const text = messageInput.value.trim();

  if (!text && state.files.length === 0) {
    return;
  }

  let userText = text;

  if (state.files.length > 0) {

    const names = state.files
      .map(file => file.name)
      .join(", ");

    userText +=
      (userText ? "\n\n" : "") +
      "[Attached files: " +
      names +
      "]";
  }

  messageInput.value = "";
  resizeTextarea();

  addMessage("user", userText);

  const requestMessages = [
    {
      role: "system",
      content: SYSTEM_PROMPT
    },
    ...state.messages
  ];

  addMessageToCurrentChat();

  state.files = [];
  renderFilePreview();

  sendButton.disabled = true;

  addTypingIndicator();

  try {

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: requestMessages
      })
    });

    if (!response.ok) {
      throw new Error(
        "AI server returned HTTP " + response.status
      );
    }

    const data = await response.json();

    removeTypingIndicator();

    if (!data.reply) {
      throw new Error("No reply was returned.");
    }

    addMessage("assistant", data.reply);
    addMessageToCurrentChat();

  } catch (error) {

    removeTypingIndicator();

    addMessage(
      "assistant",
      "I couldn't connect to the Jarvis AI server yet.\n\n" +
      "The website is working, but the /api/chat backend still needs to be connected to the AI model."
    );

    console.error(error);

  } finally {

    sendButton.disabled = false;
    messageInput.focus();
  }
}

function addMessageToCurrentChat() {

  if (state.messages.length === 0) {
    return;
  }

  const firstUserMessage =
    state.messages.find(m => m.role === "user");

  if (!firstUserMessage) {
    return;
  }

  const existing =
    state.chats.find(chat => chat.id === currentChatId);

  if (existing) {

    existing.messages = [...state.messages];
    existing.updated = Date.now();

  } else {

    const chat = {
      id: createId(),
      title: firstUserMessage.content.slice(0, 45),
      messages: [...state.messages],
      updated: Date.now()
    };

    currentChatId = chat.id;
    state.chats.unshift(chat);
  }

  saveChats();
  renderChatList();
}

let currentChatId = null;

function newChat() {

  state.messages = [];
  state.files = [];
  currentChatId = null;

  renderMessages();
  renderFilePreview();

  messageInput.value = "";
  messageInput.focus();

  if (window.innerWidth <= 800) {
    sidebar.classList.remove("open");
  }
}

function loadChat(id) {

  const chat = state.chats.find(c => c.id === id);

  if (!chat) {
    return;
  }

  currentChatId = id;
  state.messages = [...chat.messages];
  state.files = [];

  renderMessages();
  renderFilePreview();

  if (window.innerWidth <= 800) {
    sidebar.classList.remove("open");
  }
}

function renderChatList() {

  conversationList.innerHTML = "";

  for (const chat of state.chats) {

    const item = document.createElement("div");
    item.className = "conversation";
    item.textContent = chat.title || "New conversation";

    item.addEventListener("click", () => {
      loadChat(chat.id);
    });

    conversationList.appendChild(item);
  }
}

function renderFilePreview() {

  filePreview.innerHTML = "";

  for (let i = 0; i < state.files.length; i++) {

    const file = state.files[i];

    const chip = document.createElement("div");
    chip.className = "file-chip";

    const name = document.createElement("span");
    name.textContent = file.name;

    const remove = document.createElement("button");
    remove.textContent = "×";

    remove.addEventListener("click", () => {
      state.files.splice(i, 1);
      renderFilePreview();
    });

    chip.appendChild(name);
    chip.appendChild(remove);

    filePreview.appendChild(chip);
  }
}

function resizeTextarea() {

  messageInput.style.height = "auto";

  messageInput.style.height =
    Math.min(
      messageInput.scrollHeight,
      180
    ) + "px";
}

messageInput.addEventListener("input", resizeTextarea);

messageInput.addEventListener("keydown", event => {

  if (
    event.key === "Enter" &&
    !event.shiftKey
  ) {
    event.preventDefault();
    sendMessage();
  }
});

sendButton.addEventListener(
  "click",
  sendMessage
);

newChatButton.addEventListener(
  "click",
  newChat
);

clearChatsButton.addEventListener("click", () => {

  if (!confirm("Delete all Jarvis conversations?")) {
    return;
  }

  state.chats = [];
  saveChats();
  newChat();
  renderChatList();
});

attachButton.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", event => {

  const selected = Array.from(
    event.target.files
  );

  state.files.push(...selected);

  renderFilePreview();

  fileInput.value = "";
});

menuButton.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

document
  .querySelectorAll(".suggestions button")
  .forEach(button => {

    button.addEventListener("click", () => {

      messageInput.value =
        button.dataset.prompt;

      resizeTextarea();
      messageInput.focus();
    });
  });

renderMessages();
renderChatList();
