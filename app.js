import * as webllm from
  "https://esm.run/@mlc-ai/web-llm";


/*
===========================================================
 JARVIS
 LOCAL BROWSER AI
 NO BACKEND
 NO API
 NO API KEY
 NO SERVER
===========================================================

The model runs directly on the device using WebGPU.

The first time Jarvis starts, the browser downloads the
model files and stores them locally.

After that, the browser can reuse the cached model.
*/


/*
===========================================================
 MODEL
===========================================================

This model is intentionally small enough to have a much
better chance of running on an iPad.

WebLLM supports low-resource models for devices with
limited GPU memory.
*/

const MODEL_ID =
  "Llama-3.2-1B-Instruct-q4f16_1-MLC";


/*
===========================================================
 ELEMENTS
===========================================================
*/

const sidebar =
  document.getElementById("sidebar");

const menu =
  document.getElementById("menu");

const chatList =
  document.getElementById("chatList");

const newChat =
  document.getElementById("newChat");

const clearChats =
  document.getElementById("clearChats");

const status =
  document.getElementById("status");

const statusDot =
  status.querySelector("span");

const input =
  document.getElementById("input");

const send =
  document.getElementById("send");

const messages =
  document.getElementById("messages");

const welcome =
  document.getElementById("welcome");

const startAI =
  document.getElementById("startAI");

const progressText =
  document.getElementById("progressText");

const progressBar =
  document.getElementById("progressBar");

const attach =
  document.getElementById("attach");

const fileInput =
  document.getElementById("fileInput");

const filesElement =
  document.getElementById("files");


/*
===========================================================
 STATE
===========================================================
*/

let engine = null;

let aiReady = false;

let generating = false;

let currentChat = [];

let attachedFiles = [];

let chats = [];

let currentChatId = null;


/*
===========================================================
 SYSTEM PROMPT
===========================================================
*/

const SYSTEM_PROMPT = `
You are JARVIS, a highly capable personal AI assistant.

Your job is to be useful, accurate, clear, and practical.

When solving problems:
- Think carefully before answering.
- Check calculations.
- Explain important steps.
- Do not invent facts when you are uncertain.
- Ask for clarification when necessary.

When writing code:
- Give complete working code when appropriate.
- Prefer simple, reliable solutions.
- Explain important implementation details.

Keep answers reasonably concise unless the user asks
for a detailed explanation.

You are running locally on the user's device.
`;


/*
===========================================================
 LOCAL STORAGE
===========================================================
*/

function saveChats() {

  try {

    localStorage.setItem(
      "jarvis-chats",
      JSON.stringify(chats)
    );

  } catch (error) {

    console.warn(
      "Could not save chats:",
      error
    );

  }

}


function loadChats() {

  try {

    const saved =
      localStorage.getItem("jarvis-chats");

    if (saved) {

      chats = JSON.parse(saved);

    }

  } catch (error) {

    chats = [];

  }

}


/*
===========================================================
 CHAT LIST
===========================================================
*/

function renderChatList() {

  chatList.innerHTML = "";

  chats.forEach(chat => {

    const button =
      document.createElement("button");

    button.className = "chat-item";

    button.textContent =
      chat.title || "New chat";

    button.onclick = () => {

      loadChat(chat.id);

      sidebar.classList.remove("open");

    };

    chatList.appendChild(button);

  });

}


/*
===========================================================
 CREATE CHAT
===========================================================
*/

function createChat() {

  const id =
    Date.now().toString();

  const chat = {

    id,

    title: "New chat",

    messages: []

  };

  chats.unshift(chat);

  currentChatId = id;

  currentChat = [];

  saveChats();

  renderChatList();

  messages.innerHTML = "";

  welcome.style.display = "";

}


/*
===========================================================
 LOAD CHAT
===========================================================
*/

function loadChat(id) {

  const chat =
    chats.find(c => c.id === id);

  if (!chat) return;

  currentChatId = id;

  currentChat =
    chat.messages || [];

  messages.innerHTML = "";

  welcome.style.display =
    currentChat.length
      ? "none"
      : "";

  for (const message of currentChat) {

    addMessageToScreen(
      message.role,
      message.content
    );

  }

}


/*
===========================================================
 SAVE CURRENT CHAT
===========================================================
*/

function saveCurrentChat() {

  if (!currentChatId) {

    createChat();

  }

  const chat =
    chats.find(
      c => c.id === currentChatId
    );

  if (!chat) return;

  chat.messages =
    currentChat;

  if (
    currentChat.length &&
    chat.title === "New chat"
  ) {

    const firstUserMessage =
      currentChat.find(
        m => m.role === "user"
      );

    if (firstUserMessage) {

      chat.title =
        firstUserMessage.content
          .slice(0, 35)
          .replace(/\n/g, " ");

    }

  }

  saveChats();

  renderChatList();

}


/*
===========================================================
 SCREEN MESSAGES
===========================================================
*/

function addMessageToScreen(
  role,
  content
) {

  const message =
    document.createElement("div");

  message.className =
    `message ${role}`;

  const avatar =
    document.createElement("div");

  avatar.className =
    "avatar";

  avatar.textContent =
    role === "user"
      ? "U"
      : "J";

  const body =
    document.createElement("div");

  body.className =
    "message-body";

  body.textContent =
    content;

  message.appendChild(avatar);

  message.appendChild(body);

  messages.appendChild(message);

  scrollToBottom();

  return body;

}


/*
===========================================================
 THINKING MESSAGE
===========================================================
*/

function addThinkingMessage() {

  const message =
    document.createElement("div");

  message.className =
    "message assistant";

  const avatar =
    document.createElement("div");

  avatar.className =
    "avatar";

  avatar.textContent =
    "J";

  const body =
    document.createElement("div");

  body.className =
    "message-body thinking";

  body.textContent =
    "Thinking...";

  message.appendChild(avatar);

  message.appendChild(body);

  messages.appendChild(message);

  scrollToBottom();

  return body;

}


/*
===========================================================
 SCROLL
===========================================================
*/

function scrollToBottom() {

  const chat =
    document.getElementById("chat");

  chat.scrollTop =
    chat.scrollHeight;

}


/*
===========================================================
 STATUS
===========================================================
*/

function setStatus(
  text,
  ready = false
) {

  status.childNodes[1].nodeValue =
    " " + text;

  if (ready) {

    statusDot.style.background =
      "#35b95f";

  } else {

    statusDot.style.background =
      "#d8a52b";

  }

}


/*
===========================================================
 WEBGPU CHECK
===========================================================
*/

async function checkWebGPU() {

  if (!navigator.gpu) {

    throw new Error(
      "WebGPU is not available in this browser. Use a current version of Safari or another WebGPU-compatible browser."
    );

  }

  const adapter =
    await navigator.gpu.requestAdapter();

  if (!adapter) {

    throw new Error(
      "Your device could not provide a WebGPU adapter."
    );

  }

  return adapter;

}


/*
===========================================================
 START LOCAL AI
===========================================================
*/

async function startJarvis() {

  if (aiReady) return;

  startAI.disabled = true;

  progressText.textContent =
    "Checking WebGPU...";

  progressBar.style.width =
    "2%";

  try {

    await checkWebGPU();

    progressText.textContent =
      "WebGPU is ready.";

    progressBar.style.width =
      "5%";


    /*
    -------------------------------------------------------
    Create the model directly in the browser.

    There is NO backend URL here.
    -------------------------------------------------------
    */

    engine =
      await webllm.CreateMLCEngine(
        MODEL_ID,
        {

          initProgressCallback:
            (report) => {

              if (
                report &&
                typeof report.progress === "number"
              ) {

                const percent =
                  Math.round(
                    report.progress * 100
                  );

                progressBar.style.width =
                  Math.max(
                    5,
                    Math.min(100, percent)
                  ) + "%";

              }

              if (
                report &&
                report.text
              ) {

                progressText.textContent =
                  report.text;

              }

            },

          logLevel: "ERROR"

        },

        {
          context_window_size: 4096
        }

      );


    /*
    -------------------------------------------------------
    AI IS NOW LOCAL
    -------------------------------------------------------
    */

    aiReady = true;

    progressBar.style.width =
      "100%";

    progressText.textContent =
      "Jarvis is ready.";

    setStatus(
      "AI ready",
      true
    );

    input.disabled = false;

    send.disabled = false;

    startAI.textContent =
      "Jarvis is Ready";

    startAI.disabled = true;

    input.focus();

  } catch (error) {

    console.error(error);

    aiReady = false;

    progressBar.style.width =
      "0%";

    progressText.textContent =
      "Could not start local AI.";

    startAI.disabled = false;

    setStatus(
      "AI unavailable"
    );

    alert(
      "Jarvis could not start the local AI.\n\n" +
      error.message +
      "\n\nMake sure you are using a browser with WebGPU enabled."
    );

  }

}


/*
===========================================================
 SEND MESSAGE
===========================================================
*/

async function sendMessage() {

  if (!aiReady) {

    await startJarvis();

    if (!aiReady) return;

  }

  if (generating) return;

  let text =
    input.value.trim();

  if (!text) return;


  /*
  -------------------------------------------------------
  ATTACHED TEXT FILES
  -------------------------------------------------------
  */

  if (attachedFiles.length) {

    const fileText =
      attachedFiles
        .map(file =>
          `\n\n[Attached file: ${file.name}]\n${file.text}`
        )
        .join("");

    text += fileText;

  }


  /*
  -------------------------------------------------------
  CREATE CHAT IF NECESSARY
  -------------------------------------------------------
  */

  if (!currentChatId) {

    createChat();

  }


  welcome.style.display =
    "none";


  input.value = "";

  input.style.height =
    "auto";


  currentChat.push({

    role: "user",

    content: text

  });


  addMessageToScreen(
    "user",
    text
  );

  saveCurrentChat();


  generating = true;

  send.disabled = true;

  input.disabled = true;


  const thinking =
    addThinkingMessage();


  try {

    /*
    -----------------------------------------------------
    Build conversation for local model.
    -----------------------------------------------------
    */

    const modelMessages = [

      {
        role: "system",
        content: SYSTEM_PROMPT
      },

      ...currentChat

    ];


    /*
    -----------------------------------------------------
    LOCAL MODEL GENERATION

    This call stays inside the browser.

    No fetch().
    No /api/chat.
    No backend.
    -----------------------------------------------------
    */

    const response =
      await engine.chat.completions.create({

        messages:
          modelMessages,

        temperature:
          0.7,

        top_p:
          0.9,

        max_tokens:
          1024

      });


    const answer =
      response?.choices?.[0]?.message?.content
      || "I couldn't generate a response.";


    thinking.classList.remove(
      "thinking"
    );

    thinking.textContent =
      answer;


    currentChat.push({

      role: "assistant",

      content: answer

    });


    saveCurrentChat();

    scrollToBottom();


  } catch (error) {

    console.error(error);

    thinking.classList.remove(
      "thinking"
    );

    thinking.textContent =
      "I couldn't complete that request.\n\n" +
      error.message;

  }


  generating = false;

  send.disabled = false;

  input.disabled = false;

  input.focus();

}


/*
===========================================================
 ENTER TO SEND
===========================================================
*/

input.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  }
);


/*
===========================================================
 SEND BUTTON
===========================================================
*/

send.addEventListener(
  "click",
  sendMessage
);


/*
===========================================================
 AUTO RESIZE TEXTAREA
===========================================================
*/

input.addEventListener(
  "input",
  () => {

    input.style.height =
      "auto";

    input.style.height =
      Math.min(
        input.scrollHeight,
        180
      ) + "px";

  }
);


/*
===========================================================
 START BUTTON
===========================================================
*/

startAI.addEventListener(
  "click",
  startJarvis
);


/*
===========================================================
 SUGGESTION BUTTONS
===========================================================
*/

document
  .querySelectorAll(".cards button")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        input.value =
          button.dataset.prompt || "";

        if (aiReady) {

          input.focus();

        } else {

          startJarvis();

        }

      }
    );

  });


/*
===========================================================
 NEW CHAT
===========================================================
*/

newChat.addEventListener(
  "click",
  () => {

    createChat();

    input.value = "";

    attachedFiles = [];

    renderFiles();

    input.focus();

  }
);


/*
===========================================================
 CLEAR CHATS
===========================================================
*/

clearChats.addEventListener(
  "click",
  () => {

    if (
      !confirm(
        "Delete all Jarvis chats?"
      )
    ) return;

    chats = [];

    currentChat = [];

    currentChatId = null;

    saveChats();

    renderChatList();

    messages.innerHTML = "";

    welcome.style.display = "";

  }
);


/*
===========================================================
 MOBILE SIDEBAR
===========================================================
*/

menu.addEventListener(
  "click",
  () => {

    sidebar.classList.toggle(
      "open"
    );

  }
);


/*
===========================================================
 FILE ATTACHMENTS
===========================================================
*/

attach.addEventListener(
  "click",
  () => {

    fileInput.click();

  }
);


fileInput.addEventListener(
  "change",
  async () => {

    const selected =
      Array.from(
        fileInput.files || []
      );

    for (const file of selected) {

      try {

        let text = "";

        /*
        ---------------------------------------------------
        Text-based files can be read completely locally.
        ---------------------------------------------------
        */

        if (
          file.type.startsWith("text/") ||
          /\.(txt|md|csv|json|html|css|js|py|java|cpp|c|h|xml|yaml|yml|log)$/i
            .test(file.name)
        ) {

          text =
            await file.text();

        } else {

          text =
            `[${file.name} is an image or binary file. The local text model cannot directly read this file type.]`;

        }

        attachedFiles.push({

          name:
            file.name,

          text

        });

      } catch (error) {

        console.error(
          "File error:",
          error
        );

      }

    }

    renderFiles();

    fileInput.value = "";

  }
);


/*
===========================================================
 RENDER FILES
===========================================================
*/

function renderFiles() {

  filesElement.innerHTML = "";

  attachedFiles.forEach(
    (file, index) => {

      const element =
        document.createElement("div");

      element.className =
        "file";

      element.textContent =
        file.name + " ×";

      element.style.cursor =
        "pointer";

      element.onclick = () => {

        attachedFiles.splice(
          index,
          1
        );

        renderFiles();

      };

      filesElement.appendChild(
        element
      );

    }
  );

}


/*
===========================================================
 INITIALIZE
===========================================================
*/

loadChats();

renderChatList();

setStatus(
  "Waiting to start"
);

progressText.textContent =
  "Press Start Jarvis AI to load the local model.";

console.log(
  "JARVIS loaded."
);

console.log(
  "No backend configured."
);

console.log(
  "AI will run locally through WebGPU."
);
