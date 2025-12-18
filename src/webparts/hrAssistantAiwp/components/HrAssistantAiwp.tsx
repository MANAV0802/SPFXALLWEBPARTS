import * as React from "react";
import styles from "./HrAssistantAiwp.module.scss";

/* =======================
   Types
======================= */
interface IChatMessage {
  sender: "user" | "bot";
  text: string;
}

/* =======================
   Component
======================= */
const HrAssistantAiwp: React.FC = () => {
  const [messages, setMessages] = React.useState<IChatMessage[]>([]);
  const [input, setInput] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);

  const bottomRef = React.useRef<HTMLDivElement>(null);

  /* =======================
     Power Automate URL
  ======================= */
  const FLOW_URL =
    "https://defaultdfbd00d3ece143c7a14b26433232e9.8c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/7b4f13df5fe24c3fb306548486db180a/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ictbDppdQCZZI1-Rn0c-UbVJTfJ1lD8XCkHoivJMLAE";

  /* =======================
     Auto Scroll
  ======================= */
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* =======================
     Format AI Message
  ======================= */
  const formatMessage = (text: string): string => {
    const lines = text.split("\n");
    let html = "";
    let inList = false;

    lines.forEach(line => {
      if (line.trim().indexOf("* ") === 0) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += `<li>${line.replace("* ", "")}</li>`;
      } else {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `${line}<br/>`;
      }
    });

    if (inList) html += "</ul>";

    return html;
  };

  /* =======================
     Call Power Automate
  ======================= */
const askAI = async (question: string): Promise<string> => {
  try {
    const response = await fetch(FLOW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    const text = await response.text();

    if (!text || !text.trim()) {
      return "⚠️ AI returned an empty response.";
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      // If response is plain text
      return text;
    }

    if (data?.reply && data.reply.trim()) {
      return data.reply;
    }

    return "⚠️ AI did not return a readable answer.";
  } catch (error) {
    console.error("AI Error:", error);
    return "❌ Failed to get response from AI service.";
  }
};

  /* =======================
     Send Message
  ======================= */
  const sendMessage = async (): Promise<void> => {
    if (!input.trim() || loading) return;

    const userText = input.trim();

    setMessages(prev => [...prev, { sender: "user", text: userText }]);
    setInput("");
    setLoading(true);

    let botReply = "⚠️ No response from AI.";

    try {
      botReply = await askAI(userText);
    } finally {
      setMessages(prev => [...prev, { sender: "bot", text: botReply }]);
      setLoading(false);
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        🤖 <span>HR Assistant</span>
      </div>

      <div className={styles.chatContainer}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`${styles.messageRow} ${
              msg.sender === "user" ? styles.userRow : styles.botRow
            }`}
          >
            {msg.sender === "bot" && (
              <div className={styles.avatar}>🤖</div>
            )}

            <div
              className={`${styles.messageBubble} ${
                msg.sender === "user"
                  ? styles.userBubble
                  : styles.botBubble
              }`}
              dangerouslySetInnerHTML={{
                __html:
                  msg.sender === "bot"
                    ? formatMessage(msg.text)
                    : msg.text
              }}
            />

            {msg.sender === "user" && (
              <div className={styles.avatar}>👤</div>
            )}
          </div>
        ))}

        {loading && (
          <div className={styles.messageRow}>
            <div className={styles.avatar}>🤖</div>
            <div className={`${styles.messageBubble} ${styles.botBubble}`}>
              Typing…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className={styles.inputArea}>
        <input
          className={styles.inputBox}
          placeholder="Ask HR related questions..."
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button
          className={styles.sendButton}
          disabled={loading}
          onClick={sendMessage}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default HrAssistantAiwp;
