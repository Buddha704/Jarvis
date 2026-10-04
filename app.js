import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const MODEL_ID = "Qwen3-4B-q4f16_1-MLC";

const SYSTEM_PROMPT = `
You are JARVIS, a highly capable personal AI assistant.

Your goals:
- Give accurate and useful answers.
- Reason carefully through difficult problems.
- Help with programming, mathematics, writing, planning, research,
  explanations, and everyday tasks.
- Remember the conversation within the current chat.
- Be clear and direct.
- Do not pretend to have performed actions you did not perform.
- If you are uncertain, say so.
- Your name is JARVIS.
`;

let engine = null;
let aiReady = false;

let messages = [];
let files = [];

let chats =
    JSON.parse(localStorage.getItem("jarvis-chats") || "[]");

let currentChatId = null;

const input = document.getElementById("input");
const sendButton = document.getElementById("send");
const messagesElement = document.getElementById("messages");
const welcome = document.getElementById("welcome");

const startButton =
    document.getElementById("startAI");

const progressText =
    document.getElementById("progressText");

const progressBar =
    document.getElementById("progressBar");

const status =
    document.getElementById("status");

const fileInput =
    document.getElementById("fileInput");

const filesElement =
    document.getElementById("files");

const chatList =
    document.getElementById("chatList");


// ----------------------------------------------------
// STATUS
// ----------------------------------------------------

function setStatus(text, type = "") {

    status.className = "status " + type;

    status.innerHTML =
        `<span></span>${text}`;
}


// ----------------------------------------------------
// START AI
// ----------------------------------------------------

async function startJarvis() {

    if (!navigator.gpu) {

        progressText.textContent =
            "WebGPU is not available in this browser.";

        setStatus(
            "WebGPU unavailable",
            "error"
        );

        return;
    }

    startButton.disabled = true;

    progressText.textContent =
        "Preparing Jarvis...";

    setStatus("Loading AI...");

    try {

        engine =
            await webllm.CreateMLCEngine(
                MODEL_ID,
                {
                    initProgressCallback:
                        progress => {

                            const percent =
                                Math.round(
                                    (progress.progress || 0) * 100
                                );

                            progressBar.style.width =
                                percent + "%";

                            progressText.textContent =
                                progress.text ||
                                `Loading AI: ${percent}%`;
                        }
                }
            );

        aiReady = true;

        progressBar.style.width = "100%";

        progressText.textContent =
            "Jarvis is ready.";

        setStatus(
            "Jarvis ready",
            "ready"
        );

        input.disabled = false;
        sendButton.disabled = false;

        startButton.textContent =
            "Jarvis Ready";

        input.focus();

    } catch (error) {

        console.error(error);

        progressText.textContent =
            "Jarvis could not load on this device.";

        setStatus(
            "AI failed to load",
            "error"
        );

        startButton.disabled = false;
    }
}


// ----------------------------------------------------
// CHAT DISPLAY
// ----------------------------------------------------

function renderMessages() {

    if (messages.length === 0) {

        welcome.style.display =
            "flex";

        messagesElement.innerHTML =
            "";

        return;
    }

    welcome.style.display =
        "none";

    messagesElement.innerHTML =
        "";

    for (const message of messages) {

        const row =
            document.createElement("div");

        row.className =
            "message " +
            message.role;

        const avatar =
            document.createElement("div");

        avatar.className =
            "avatar";

        avatar.textContent =
            message.role === "user"
                ? "U"
                : "J";

        const body =
            document.createElement("div");

        body.className =
            "message-body";

        body.textContent =
            message.content;

        row.appendChild(avatar);
        row.appendChild(body);

        messagesElement.appendChild(row);
    }

    scrollChat();
}


function scrollChat() {

    requestAnimationFrame(() => {

        const chat =
            document.getElementById("chat");

        chat.scrollTop =
            chat.scrollHeight;
    });
}


// ----------------------------------------------------
// SEND MESSAGE
// ----------------------------------------------------

async function sendMessage() {

    if (!aiReady) {

        alert(
            "Start Jarvis AI first."
        );

        return;
    }

    if (sendButton.disabled)
        return;

    const text =
        input.value.trim();

    if (!text && files.length === 0)
        return;

    let userMessage =
        text;

    // Add selected file contents
    for (const file of files) {

        try {

            if (
                file.type.startsWith("text/") ||
                /\.(txt|md|csv|json|js|css|html|py|java|cpp|c|h)$/i
                    .test(file.name)
            ) {

                const contents =
                    await file.text();

                userMessage +=
                    `\n\n[File: ${file.name}]\n` +
                    contents.slice(0, 50000);
            }

            else {

                userMessage +=
                    `\n\n[Attached file: ${file.name}]`;
            }

        } catch {

            userMessage +=
                `\n\n[Could not read: ${file.name}]`;
        }
    }

    input.value =
        "";

    input.style.height =
        "auto";

    files =
        [];

    renderFiles();

    messages.push({
        role: "user",
        content: userMessage
    });

    renderMessages();

    sendButton.disabled =
        true;

    showThinking();

    try {

        const response =
            await engine.chat.completions.create({

                messages: [
                    {
                        role: "system",
                        content: SYSTEM_PROMPT
                    },

                    ...messages
                ],

                temperature: 0.7,

                top_p: 0.9,

                max_tokens: 1000,

                stream: true
            });

        removeThinking();

        let answer =
            "";

        const row =
            createStreamingMessage();

        for await (
            const chunk of response
        ) {

            const piece =
                chunk.choices?.[0]?.delta?.content ||
                "";

            answer +=
                piece;

            row.textContent =
                answer;

            scrollChat();
        }

        messages.push({
            role: "assistant",
            content: answer
        });

        saveCurrentChat();

    } catch (error) {

        console.error(error);

        removeThinking();

        messages.push({
            role: "assistant",
            content:
                "I ran into an error while generating that response. Please try again."
        });

        renderMessages();

    } finally {

        sendButton.disabled =
            false;

        input.focus();
    }
}


// ----------------------------------------------------
// THINKING INDICATOR
// ----------------------------------------------------

function showThinking() {

    const row =
        document.createElement("div");

    row.id =
        "thinking";

    row.className =
        "message assistant";

    row.innerHTML = `
        <div class="avatar">J</div>
        <div class="message-body thinking">
            Jarvis is thinking...
        </div>
    `;

    messagesElement.appendChild(row);

    scrollChat();
}


function removeThinking() {

    const thinking =
        document.getElementById(
            "thinking"
        );

    if (thinking)
        thinking.remove();
}


function createStreamingMessage() {

    const row =
        document.createElement("div");

    row.className =
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
        "message-body";

    row.appendChild(avatar);
    row.appendChild(body);

    messagesElement.appendChild(row);

    return body;
}


// ----------------------------------------------------
// FILES
// ----------------------------------------------------

function renderFiles() {

    filesElement.innerHTML =
        "";

    files.forEach(
        (file, index) => {

            const item =
                document.createElement("div");

            item.className =
                "file";

            item.innerHTML =
                `${escapeHTML(file.name)}
                 <button>×</button>`;

            item.querySelector(
                "button"
            ).onclick = () => {

                files.splice(
                    index,
                    1
                );

                renderFiles();
            };

            filesElement.appendChild(
                item
            );
        }
    );
}


function escapeHTML(text) {

    return text.replace(
        /[&<>"']/g,
        character => ({

            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"

        })[character]
    );
}


// ----------------------------------------------------
// CHAT MEMORY
// ----------------------------------------------------

function saveCurrentChat() {

    if (!messages.length)
        return;

    const firstUser =
        messages.find(
            message =>
                message.role === "user"
        );

    if (!firstUser)
        return;

    let chat =
        chats.find(
            item =>
                item.id === currentChatId
        );

    if (!chat) {

        chat = {

            id:
                crypto.randomUUID(),

            title:
                firstUser.content
                    .slice(0, 45),

            messages: [],

            updated:
                Date.now()
        };

        currentChatId =
            chat.id;

        chats.unshift(chat);
    }

    chat.messages =
        [...messages];

    chat.updated =
        Date.now();

    localStorage.setItem(
        "jarvis-chats",
        JSON.stringify(chats)
    );

    renderChatList();
}


function renderChatList() {

    chatList.innerHTML =
        "";

    for (const chat of chats) {

        const item =
            document.createElement("div");

        item.className =
            "chat-item";

        item.textContent =
            chat.title;

        item.onclick = () => {

            currentChatId =
                chat.id;

            messages =
                [...chat.messages];

            renderMessages();
        };

        chatList.appendChild(
            item
        );
    }
}


// ----------------------------------------------------
// NEW CHAT
// ----------------------------------------------------

document
    .getElementById("newChat")
    .onclick = () => {

        messages = [];

        files = [];

        currentChatId =
            null;

        renderMessages();

        renderFiles();

        input.value =
            "";

        input.focus();
    };


// ----------------------------------------------------
// CLEAR CHATS
// ----------------------------------------------------

document
    .getElementById("clearChats")
    .onclick = () => {

        if (
            !confirm(
                "Clear all Jarvis conversations?"
            )
        )
            return;

        chats = [];

        localStorage.removeItem(
            "jarvis-chats"
        );

        messages = [];

        currentChatId =
            null;

        renderMessages();

        renderChatList();
    };


// ----------------------------------------------------
// FILE PICKER
// ----------------------------------------------------

document
    .getElementById("attach")
    .onclick = () => {

        fileInput.click();
    };


fileInput.onchange =
    event => {

        files.push(
            ...Array.from(
                event.target.files
            )
        );

        renderFiles();

        fileInput.value =
            "";
    };


// ----------------------------------------------------
// ENTER TO SEND
// ----------------------------------------------------

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


// ----------------------------------------------------
// TEXTAREA SIZE
// ----------------------------------------------------

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


// ----------------------------------------------------
// SUGGESTIONS
// ----------------------------------------------------

document
    .querySelectorAll(
        ".cards button"
    )
    .forEach(button => {

        button.onclick = () => {

            input.value =
                button.dataset.prompt;

            input.focus();

            input.dispatchEvent(
                new Event("input")
            );
        };
    });


// ----------------------------------------------------
// MOBILE MENU
// ----------------------------------------------------

document
    .getElementById("menu")
    .onclick = () => {

        document
            .getElementById("sidebar")
            .classList.toggle("open");
    };


// ----------------------------------------------------
// START
// ----------------------------------------------------

startButton.onclick =
    startJarvis;

renderMessages();

renderChatList();
