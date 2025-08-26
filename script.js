// Wichtige DOM-Elemente holen
const body = document.querySelector("body");
const message = document.getElementById("message");
const chatbox = document.getElementById("chatbox");
const sendBtn = document.getElementById("sendBtn");
const stopBtn = document.getElementById("stopBtn");
const clearBtn = document.getElementById("clearBtn");
const wrapper = document.getElementById("wrapper");
const modellInfo = document.getElementById("modellInfo");

const systemPromt = document.getElementById("systemPromt");
const systemPromptModal = document.getElementById("systemPromptModal");
const systemPromptInput = document.getElementById("systemPromptModal-textarea");
const systemPromptModalSave = document.getElementById("systemPromptModal-save");
const systemPromptModalCancel = document.getElementById("systemPromptModal-cancel");

const apikeyModal = document.getElementById("apikeyModal");
const apikeyModalCancel = document.getElementById("apikeyModal-cancel");

const deleteModal = document.getElementById("deleteModal");
const deleteModalCancel = document.getElementById("deleteModal-cancel");
const deleteModalDelete = document.getElementById("deleteModal-delete");

const menuToggle = document.getElementById("menu-toggle");
const headerMenu = document.getElementById("headerMenu");

const themeRadios = document.querySelectorAll('input[name="theme"]');
const root = document.documentElement;
const canvas = document.querySelector("canvas"); // Canvas-Element auswählen
const ctx = canvas.getContext("2d"); // Den 2D-Kontext des Canvas holen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const w = window.innerWidth; // Breite des Canvas
const h = window.innerHeight; // Höhe des Canvas

const particleCount = w < 500 ? 100 : 200; // Anzahl der Partikel
const maxDist = w < 500 ? 100 : 200; // Maximale Distanz für Linien

const mouse = { x: 0, y: 0 };
let particles = []; // Array für die Partikel

const defaultSystemPrompt = "Du bist ein hilfreicher und freundlicher Assistent. Bitte beantworte die Fragen so gut wie möglich.";

// Modelle für die Chat-API
const models = [
    {
        name: "OpenAI:<br>(GPT-4.1-mini)",
        route: "https://api.openai.com/v1/chat/completions",
        model: "gpt-5",
        apiKey: "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",
    },
    {
        name: "OpenRouter:<br>(Gemma-3-27B) ",
        route: "https://openrouter.ai/api/v1/chat/completions",
        model: "google/gemma-3-27b-it:free",
        apiKey: null,
    },
];

// System Prompt initial setzen, falls nicht vorhanden
if (!localStorage.getItem("systemPrompt")) {
    localStorage.setItem("systemPrompt", defaultSystemPrompt);
}

let currentModelIndex = parseInt(
    localStorage.getItem("chat_model_index") || "0"
);
let abortController = null;
let typingAborted = false;

// Fenstergröße-Anpassung für Wrapper
window.addEventListener("resize", () => {
    wrapper.style.height = window.innerHeight + "px";
});

// Hilfsfunktionen ----------------------------------------------------------------------------------------------------

// Automatische Höhe für Textarea
function autoResize(el) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
}

// Liefert das aktuell ausgewählte Modell
function getSelectedModel() {
    return models[currentModelIndex];
}

// API-Key aus localStorage holen oder abfragen
async function getApiKey() {
    const selectedModel = getSelectedModel();
    body.style.display = "flex";
    if (selectedModel.apiKey) return selectedModel.apiKey;
    let key = localStorage.getItem(selectedModel.model);
    if (!key) {
        key = await promptForApiKey(selectedModel.name);
        if (key) {
            selectedModel.apiKey = key;
            localStorage.setItem(selectedModel.model, key);
        }
    } else {
        selectedModel.apiKey = key;
    }
    return selectedModel.apiKey;
}

// Modal zur Abfrage des API-Keys anzeigen
function promptForApiKey(modelName) {
    return new Promise((resolve) => {
        const textarea = document.getElementById("apikeyModal-textarea");
        const saveBtn = document.getElementById("apikeyModal-save");

        apikeyModal.querySelector("textarea").placeholder =
            `API-Key für ${modelName} eingeben...`.replace(/<br\s*\/?>/gi, "");

        textarea.value = "";
        apikeyModal.style.display = "flex";
        textarea.focus();

        function handleSave() {
            const key = textarea.value.trim();
            if (key) {
                apikeyModal.style.display = "none";
                saveBtn.removeEventListener("click", handleSave);
                textarea.removeEventListener("keydown", handleEnter);
                resolve(key);
            }
        }

        function handleEnter(e) {
            if (e.key === "Enter") {
                handleSave();
            }
        }

        saveBtn.addEventListener("click", handleSave);
        textarea.addEventListener("keydown", handleEnter);
    });
}

// Update der Model-Anzeige
function updateModelInfo() {
    modellInfo.innerHTML = `${models[currentModelIndex].name}`;
    localStorage.setItem("chat_model_index", currentModelIndex.toString());
}
updateModelInfo();

// Chatverlauf speichern
function saveToHistory(role, text) {
    let history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    history.push({ role, content: text });
    localStorage.setItem("chatHistory", JSON.stringify(history));
}

// Chatverlauf laden
function loadHistory() {
    let history = JSON.parse(localStorage.getItem("chatHistory") || "[]");

    if (history.length === 0) {
        appendMessage("assistant", "Hallo wie kann ich dir helfen");
        saveToHistory("assistant", "Hallo wie kann ich dir helfen");
        return;
    }
    history.forEach((entry) => appendMessage(entry.role, entry.content));
}

// Buttons zwischen Senden/Stop wechseln
function toggleButtons(isSending) {
    sendBtn.style.display = isSending ? "none" : "inline-block";
    stopBtn.style.display = isSending ? "inline-block" : "none";
}

// Chatbox an das Ende scrollen
function scrollToBottom() {
    setTimeout(() => {
        chatbox.scrollTop = chatbox.scrollHeight;
    }, 0);
}

// Sende-Button zurücksetzen
function resetSendButton() {
    abortController = null;
    toggleButtons(false);
}

// Animation für "Assistent tippt..."
function createLoadingDiv() {
    const loadingDiv = document.createElement("div");
    loadingDiv.classList.add("msg", "bot");
    const typingIndicator = document.createElement("div");
    typingIndicator.classList.add("typing");
    for (let i = 0; i < 3; i++)
        typingIndicator.appendChild(document.createElement("span"));
    loadingDiv.appendChild(typingIndicator);
    return loadingDiv;
}

// Nachricht im Chat anzeigen (mit optionalem Live-Tippen)
function appendMessage(role, text, live = false) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("msg", role === "user" ? "user" : "bot");
    chatbox.appendChild(msgDiv);
    scrollToBottom();

    if (!live) {
        renderFormattedText(msgDiv, text);
        return;
    }

    const words = text.split(" ");
    let i = 0;
    msgDiv.innerHTML = "";

    const liveText = document.createElement("p");
    msgDiv.appendChild(liveText);

    function typeNextWord() {
        if (typingAborted) return;
        if (i < words.length) {
            liveText.textContent += (i === 0 ? "" : " ") + words[i];
            i++;
            setTimeout(typeNextWord, 1);
        } else {
            renderFormattedText(msgDiv, liveText.textContent);
            resetSendButton();
        }
    }

    typeNextWord();
}

// Text mit Codeblöcken und Formatierung rendern
function renderFormattedText(container, rawText) {
    container.innerHTML = "";

    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(rawText)) !== null) {
        const before = rawText.slice(lastIndex, match.index);
        if (before.trim()) {
            container.appendChild(createTextBlock(before));
        }

        const language = match[1] || "text";
        const code = match[2];

        container.appendChild(createCodeBlock(language, code));
        lastIndex = codeBlockRegex.lastIndex;
    }

    const remaining = rawText.slice(lastIndex);
    if (remaining.trim()) {
        container.appendChild(createTextBlock(remaining));
    }
    // scrollToBottom();
}

// Hilfsfunktion für einfachen Text-Absatz
function createTextBlock(text) {
    const p = document.createElement("p");
    p.innerText = text;
    return p;
}

// Hilfsfunktion für Codeblöcke mit Kopierfunktion
function createCodeBlock(language, code) {
    const wrapper = document.createElement("div");
    wrapper.className = "code-wrapper";

    const header = document.createElement("div");
    header.className = "code-header";

    const langLabel = document.createElement("span");
    langLabel.className = "language-label";
    langLabel.textContent = language;

    const actions = document.createElement("div");
    actions.className = "code-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "flex gap-1 items-center select-none px-4 py-1";
    copyBtn.setAttribute("aria-label", "Kopieren");

    // SVG Icon für das Kopieren
    const svgIcon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
    );
    svgIcon.setAttribute("width", "10");
    svgIcon.setAttribute("height", "10");
    svgIcon.setAttribute("viewBox", "0 0 24 24");
    svgIcon.setAttribute("fill", "currentColor");
    svgIcon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgIcon.classList.add("icon-xs");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill-rule", "evenodd");
    path.setAttribute("clip-rule", "evenodd");
    path.setAttribute(
        "d",
        "M7 5C7 3.34315 8.34315 2 10 2H19C20.6569 2 22 3.34315 22 5V14C22 15.6569 20.6569 17 19 17H17V19C17 20.6569 15.6569 22 14 22H5C3.34315 22 2 20.6569 2 19V10C2 8.34315 3.34315 7 5 7H7V5ZM9 7H14C15.6569 7 17 8.34315 17 10V15H19C19.5523 15 20 14.5523 20 14V5C20 4.44772 19.5523 4 19 4H10C9.44772 4 9 4.44772 9 5V7ZM5 9C4.44772 9 4 9.44772 4 10V19C4 19.5523 4.44772 20 5 20H14C14.5523 20 15 19.5523 15 19V10C15 9.44772 14.5523 9 14 9H5Z"
    );
    svgIcon.appendChild(path);

    const copyText = document.createElement("span");
    copyText.textContent = "Kopieren";
    copyBtn.appendChild(svgIcon); // Das SVG wird jetzt zuerst hinzugefügt
    copyBtn.appendChild(copyText); // Der Text wird nach dem SVG hinzugefügt

    actions.appendChild(copyBtn);

    header.appendChild(langLabel);
    header.appendChild(actions);

    const codeContainer = document.createElement("div");
    codeContainer.className = "code-container";

    const codeElement = document.createElement("pre");
    codeElement.className = `language-${language}`;

    const codeInner = document.createElement("code");
    codeInner.textContent = code;

    // Der Code wird in das <pre> Tag eingefügt
    codeElement.appendChild(codeInner);
    codeContainer.appendChild(codeElement);

    wrapper.appendChild(header);
    wrapper.appendChild(codeContainer);

    // Event Listener für den Kopier-Button
    copyBtn.addEventListener("click", () => {
        navigator.clipboard
            .writeText(code)
            .then(() => {
                // Visuelle Rückmeldung, dass der Text kopiert wurde
                copyText.textContent = "Kopiert!";
                setTimeout(() => {
                    copyText.textContent = "Kopieren"; // Text nach 1,5 Sekunden zurücksetzen
                }, 1500);
            })
            .catch((err) => {
                console.error("Fehler beim Kopieren:", err);
                copyText.textContent = "Fehler!";
                setTimeout(() => {
                    copyText.textContent = "Kopieren"; // Text nach 1,5 Sekunden zurücksetzen
                }, 1500);
            });
    });

    // Highlighting mit Prism.js
    Prism.highlightElement(codeInner);

    return wrapper;
}

// Hilfsfunktion zur Extraktion von rgba-Werten aus CSS-Variablen
function extractRgbaValues(rgbaString) {
    rgbaString = rgbaString.replace(/\s+/g, ""); // Entferne alle Leerzeichen
    const rgbaRegex = /rgba?\((\d+),(\d+),(\d+),(\d+\.?\d*)\)/;
    const match = rgbaString.match(rgbaRegex);

    if (match) {
        return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3]),
            a: parseFloat(match[4]) || 1,
        };
    }
    return { r: 0, g: 0, b: 0, a: 1 }; // Fallback für ungültige Farben
}

// Initialisiere Partikel für das Hintergrund-Canvas
function initParticles() {
    particles = []; // Reset des Partikel-Arrays
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * w, // Zufällige Position
            y: Math.random() * h, // Zufällige Position
            vx: (Math.random() - 0.5) * 0.1, // Zufällige Geschwindigkeit
            vy: (Math.random() - 0.5) * 0.1, // Zufällige Geschwindigkeit
        });
    }
}

// Theme anwenden und Hintergrund neu zeichnen
function applyTheme(theme) {
    root.classList.remove(
        "theme-red",
        "theme-green",
        "theme-orange",
        "theme-blue"
    );
    root.classList.add(theme);
    localStorage.setItem("selectedTheme", theme);

    document.querySelector(`input[value="${theme}"]`).checked = true;

    // Rufe die draw-Funktion nach dem Farbwechsel auf, um das Canvas zu aktualisieren
    const primaryColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim();
    draw(primaryColor); // Neue Funktion aufrufen, die die neue Farbe berücksichtigt
}

// Zeichenfunktion für das Hintergrund-Particle-System
function draw(primaryColor) {
    ctx.clearRect(0, 0, w, h); // Canvas leeren

    // Extrahiere rgba-Werte aus der CSS-Variable
    const { r, g, b, a } = extractRgbaValues(primaryColor);

    for (let i = 0; i < particleCount; i++) {
        let p = particles[i];

        // Sicherheitsprüfung: Stelle sicher, dass das Partikel gültig ist
        if (!p || typeof p.x === "undefined" || typeof p.y === "undefined") {
            continue; // Überspringe das ungültige Partikel
        }

        // Bewegung
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        // Mausanziehung
        let dx = mouse.x - p.x;
        let dy = mouse.y - p.y;
        let distMouse = Math.sqrt(dx * dx + dy * dy);
        if (distMouse < 150) {
            p.vx += dx * 0.0005;
            p.vy += dy * 0.0005;
        }

        // Punkt zeichnen
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.1)`;
        ctx.fill();

        // Linien zu Nachbarn
        for (let j = i + 1; j < particleCount; j++) {
            let q = particles[j];
            let dx = p.x - q.x;
            let dy = p.y - q.y;
            let dist = dx * dx + dy * dy;

            if (dist < maxDist * maxDist) {
                let alpha = 1 - dist / (maxDist * maxDist);
                ctx.lineWidth = 2; // Strichstärke auf 2 setzen, anpassen nach Bedarf
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.05})`; // rgba-Werte anwenden
                ctx.stroke();
            }
        }
    }

    requestAnimationFrame(() => draw(primaryColor)); // Wiederhole den Zeichenvorgang
}

// Event Listener ----------------------------------------------------------------------------------------------------

// Klicks außerhalb von Menüs/Modals schließen diese
document.addEventListener("DOMContentLoaded", () => {
    const headerMenu = document.querySelector("#headerMenu");
    const deleteModal = document.querySelector("#deleteModal");
    const deleteModalDiv = deleteModal.querySelector("div");
    const systemPromptModal = document.querySelector("#systemPromptModal");
    const systemPromptModalDiv = systemPromptModal.querySelector("div");

    document.addEventListener("click", (e) => {
        if (
            !headerMenu.contains(e.target) &&
            !systemPromptModalDiv.contains(e.target) &&
            !deleteModalDiv.contains(e.target)
        ) {
            headerMenu.classList.remove("show");
            deleteModal.style.display = "none";
            systemPromptModal.style.display = "none";
        }
    });
});

// Doppelklick auf eine Nachricht kopiert deren Text
document.addEventListener("dblclick", function (e) {
    const msg = e.target.closest(".msg");
    if (msg) {
        const text = msg.textContent;
        navigator.clipboard
            .writeText(text)
            .then(() => {
                console.log("Text kopiert");
            })
            .catch((err) => {
                console.error("Fehler beim Kopieren:", err);
            });
    }
});

// Menü-Button
menuToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    headerMenu.classList.toggle("show");
});

// Modell wechseln bei Klick auf Modellanzeige
modellInfo.addEventListener("click", async () => {
    currentModelIndex = (currentModelIndex + 1) % models.length;
    updateModelInfo();
    await getApiKey();
});

// Senden bei Enter (aber nicht bei Shift+Enter)
message.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
    }
});

// System-Prompt Modal öffnen
systemPromt.addEventListener("click", () => {
    systemPromptModal.style.display = "flex";
    systemPromptInput.value = localStorage.getItem("systemPrompt") || "";
    headerMenu.classList.remove("show");
});

// System-Prompt Modal schließen
systemPromptModalCancel.addEventListener("click", () => {
    systemPromptModal.style.display = "none";
    headerMenu.classList.remove("show");
});

// API-Key Modal schließen
apikeyModalCancel.addEventListener("click", () => {
    apikeyModal.style.display = "none";
    headerMenu.classList.remove("show");
});

// System Prompt speichern
systemPromptModalSave.addEventListener("click", () => {
    const userInput = systemPromptInput.value.trim();
    if (userInput) {
        localStorage.setItem("systemPrompt", userInput);
        systemPromptModal.style.display = "none";
        headerMenu.classList.remove("show");
    }
});

// Chat löschen Modal öffnen
clearBtn.addEventListener("click", () => {
    deleteModal.style.display = "flex";
    headerMenu.classList.remove("show");
});

// Chat löschen Modal schließen
deleteModalCancel.addEventListener("click", () => {
    deleteModal.style.display = "none";
    headerMenu.classList.remove("show");
});

// Chatverlauf wirklich löschen
deleteModalDelete.addEventListener("click", () => {
    localStorage.removeItem("chatHistory");
    localStorage.removeItem("systemPrompt");
    localStorage.setItem("systemPrompt", defaultSystemPrompt);
    chatbox.innerHTML = "";
    message.value = "";
    toggleButtons(false);
    loadHistory();

    deleteModal.style.display = "none";
    headerMenu.classList.remove("show");
});

// Stop-Button für laufende Antwort
stopBtn.addEventListener("click", () => {
    if (abortController) {
        abortController.abort();
        typingAborted = true;
        resetSendButton();
    }
});

// Initialisierung beim Laden der Seite
window.addEventListener("load", async () => {
    wrapper.style.height = window.innerHeight + "px";
    await getApiKey();
    loadHistory();
});

// Bei Fenstergröße Wrapper anpassen (Redundanz, aber sicher)
window.addEventListener("resize", () => {
    wrapper.style.height = window.innerHeight + "px";
});

// Sende-Button klick: Nachricht senden
sendBtn.addEventListener("click", async () => {
    if (abortController) return;

    const userMsg = message.value.trim();
    if (!userMsg) return;

    toggleButtons(true);
    typingAborted = false;

    appendMessage("user", userMsg);
    saveToHistory("user", userMsg);
    message.value = "";

    const loadingDiv = createLoadingDiv();
    chatbox.appendChild(loadingDiv);
    scrollToBottom();

    try {
        const selectedModel = getSelectedModel();
        const API_KEY = await getApiKey();
        const chatHistory = JSON.parse(
            localStorage.getItem("chatHistory") || "[]"
        );

        const systemPrompt = localStorage.getItem("systemPrompt") || "";

        abortController = new AbortController();

        // Anfrage an das Modell senden
        const res = await fetch(selectedModel.route, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: selectedModel.model,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                    ...chatHistory,
                ],
            }),
            signal: abortController.signal,
        });

        const data = await res.json();
        loadingDiv.remove();

        if (data.choices && data.choices[0]) {
            const reply = data.choices[0].message.content.trim();
            appendMessage("assistant", reply, true);
            saveToHistory("assistant", reply);
        } else {
            appendMessage(
                "assistant",
                "Fehler: Keine Antwort erhalten. Versuche ein anderes Modell"
            );
            resetSendButton();
        }
    } catch (err) {
        loadingDiv.remove();
        appendMessage(
            "assistant",
            "Verbindungsfehler oder Abbruch. Versuche ein anderes Modell"
        );
        resetSendButton();
    }
    scrollToBottom();
});

// Theme-Auswahl bei Änderung speichern und anwenden
themeRadios.forEach((radio) => {
    radio.addEventListener("change", () => applyTheme(radio.value));
});

// Mausbewegung für Partikel-Effekt
canvas.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// Hauptinitialisierung nach DOM-Load
document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("selectedTheme") || "theme-blue";
    applyTheme(savedTheme);

    // Ziehe die primäre Farbe hier direkt
    const primaryColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim();
    initParticles(); // Initialisiere Partikel vor dem Zeichnen
    draw(primaryColor); // Diese Funktion wird nun direkt nach dem Laden aufgerufen
});
