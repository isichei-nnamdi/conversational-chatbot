import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { captchaToken, chat, getKb, lookup } from "./api.js";
import { Prose } from "./markdown.jsx";
import { Icon } from "./Icon.jsx";

const QUICK = [
  { icon: "notebook", verb: "Get my logbook", q: "Where do I get my logbook?" },
  { icon: "file", verb: "Get my SIWES letter", q: "How do I generate my SIWES letter?" },
  { icon: "user", verb: "Supervisor not replying", q: "My supervisor is not replying. What do I do?" },
  { icon: "calendar", verb: "How long is SIWES?", q: "How long is SIWES?" },
];

const STEPS = [
  { t: "Read the written answer", d: "Straight from the SIWES coordinator's notes." },
  { t: "Not enough? Ask the helper", d: "Short steps, in plain words." },
  { t: "Still stuck? Email the coordinator", d: "We point you to the right person." },
];

const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
  },
};

let nextId = 1;
const id = () => nextId++;

export default function App() {
  const [kb, setKb] = useState(null);
  const [kbError, setKbError] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(null); // null | "Looking for a written answer…" | "Asking the helper…"
  const [chatOpen, setChatOpen] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [consent, setConsent] = useState(() => store.get("siwes.consent"));
  const [theme, setTheme] = useState(() => store.get("siwes.theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  const endRef = useRef(null);

  const loadKb = useCallback(() => {
    setKbError(false);
    getKb().then(setKb).catch(() => setKbError(true));
  }, []);
  useEffect(loadKb, [loadKb]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    store.set("siwes.theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!messages.length) return;
    endRef.current?.scrollIntoView({ block: "end", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [messages, busy, chatOpen]);

  const maxChars = kb?.maxChars ?? 500;
  const email = kb?.coordinatorEmail ?? "the SIWES coordinator";

  const add = (m) => setMessages((ms) => [...ms, { id: id(), ...m }]);
  const patch = (mid, p) => setMessages((ms) => ms.map((m) => (m.id === mid ? { ...m, ...p } : m)));

  const history = useCallback(
    (upto) =>
      messages
        .filter((m) => m.id < upto && (m.role === "user" || m.role === "bot"))
        .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }))
        .slice(-6),
    [messages],
  );

  async function askBot(question, fromId) {
    if (kb?.recaptchaSiteKey && consent !== "yes") {
      add({
        role: "notice",
        text: "The helper needs a quick security check to keep bots out. Allow it in Privacy, or browse the topics for written answers.",
        action: "privacy",
      });
      return;
    }
    setBusy("Asking the helper… this can take a few seconds");
    try {
      const token = await captchaToken(kb?.recaptchaSiteKey);
      const out = await chat(question, history(fromId), token);
      add({ role: "bot", text: out.answer, mode: out.mode, sources: out.sources || [], question });
    } catch (e) {
      add({ role: "error", text: e.message, retry: question });
    } finally {
      setBusy(null);
    }
  }

  async function send(raw) {
    const q = raw.trim();
    if (!q || busy) return;
    setChatOpen(true);
    setText("");
    const mid = id();
    setMessages((ms) => [...ms, { id: mid, role: "user", text: q }]);
    setBusy("Looking for a written answer…");
    let doc = null;
    try {
      doc = (await lookup(q)).doc;
    } catch (e) {
      setBusy(null);
      add({ role: "error", text: e.message, retry: q });
      return;
    }
    setBusy(null);
    if (doc) add({ role: "doc", doc, question: q, verdict: null });
    else await askBot(q, mid + 1);
  }

  function verdict(m, helpful) {
    patch(m.id, { verdict: helpful ? "yes" : "no" });
    if (!helpful) askBot(m.question, m.id);
  }

  function openTopic(seg) {
    add({ role: "topic", seg });
    setChatOpen(true);
  }

  function choose(v) {
    setConsent(v);
    store.set("siwes.consent", v);
  }

  const groups = useMemo(() => (kb ? kb.groups.map((g) => ({ g, items: kb.segments.filter((s) => s.group === g) })) : []), [kb]);

  const topicState = (
    <>
      {kbError && (
        <StateBox kind="error" title="Topics didn't load" action={{ label: "Try again", run: loadKb }}>
          You can still ask the helper a question.
        </StateBox>
      )}
      {!kb && !kbError && <StateBox kind="loading" title="Loading topics…" />}
    </>
  );

  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to the content</a>

      <header className="top">
        <div className="brand">
          <span className="mark" aria-hidden="true">S</span>
          <div>
            <strong>SIWES Guide</strong>
            <small>Miva Open University</small>
          </div>
        </div>
        <div className="top-actions">
          <button type="button" className="btn ghost" onClick={() => setPrivacy(true)}>Privacy</button>
          <button type="button" className="btn ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-pressed={theme === "dark"}>
            <Icon name={theme === "dark" ? "sun" : "moon"} /> {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      <aside className="side">
        <nav aria-label="Topics">
          {topicState}
          {groups.map(({ g, items }) => (
            <div key={g} className="navgroup">
              <h2>
                {g} <span className="count">{items.length}</span>
              </h2>
              <ul>
                {items.map((s) => (
                  <li key={s.id}>
                    <button type="button" className="navitem" onClick={() => openTopic(s)}>
                      <Icon name={s.icon} />
                      <span>{s.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <a className="side-foot" href={`mailto:${email}`}>
          <Icon name="mail" /> Email the coordinator
        </a>
      </aside>

      <main className="page" id="main">
        <div className="page-inner">
          <div className="page-head">
            <div>
              <h1>What do you need help with?</h1>
              <p>Find the written answer first. Ask the helper if it isn't there.</p>
            </div>
            <button type="button" className="btn primary" onClick={() => setChatOpen(true)}>
              <Icon name="chat" /> Ask a question
            </button>
          </div>

          <section aria-labelledby="start-h">
            <h2 id="start-h" className="section-h">Start with a common question</h2>
            <ul className="tiles">
              {QUICK.map((t) => (
                <li key={t.q}>
                  <button type="button" className="tile" onClick={() => send(t.q)}>
                    <span className="well"><Icon name={t.icon} /></span>
                    <strong>{t.verb}</strong>
                    <small>{t.q}</small>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="how-h">
            <h2 id="how-h" className="section-h">How it works</h2>
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li key={s.t}>
                  <span className="num" aria-hidden="true">{i + 1}</span>
                  <div>
                    <strong>{s.t}</strong>
                    <small>{s.d}</small>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="browse" aria-labelledby="browse-h">
            <h2 id="browse-h" className="section-h">Browse by topic</h2>
            {topicState}
            {groups.map(({ g, items }) => (
              <div key={g} className="bgroup">
                <h3>{g}</h3>
                <ul>
                  {items.map((s) => (
                    <li key={s.id}>
                      <button type="button" className="navitem" onClick={() => openTopic(s)}>
                        <Icon name={s.icon} />
                        <span>{s.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </div>
      </main>

      {!chatOpen && (
        <button type="button" className="launcher" onClick={() => setChatOpen(true)} aria-haspopup="dialog">
          <Icon name="chat" /> Ask the helper
        </button>
      )}

      {chatOpen && (
        <ChatModal
          onClose={() => setChatOpen(false)}
          messages={messages}
          clear={() => setMessages([])}
          busy={busy}
          text={text}
          setText={setText}
          send={send}
          maxChars={maxChars}
          email={email}
          version={kb?.version}
          endRef={endRef}
          onVerdict={verdict}
          onPrivacy={() => setPrivacy(true)}
        />
      )}

      {consent === null && kb?.recaptchaSiteKey && (
        <div className="consent" role="region" aria-label="Privacy choice">
          <p>
            To keep bots out, the helper uses a Google security check. It runs only when you ask the helper, not when you read written answers. Allow it?
          </p>
          <div className="consent-btns">
            <button type="button" className="btn" onClick={() => choose("no")}>No, don't allow</button>
            <button type="button" className="btn" onClick={() => choose("yes")}>Yes, allow</button>
            <button type="button" className="link" onClick={() => setPrivacy(true)}>Read more</button>
          </div>
        </div>
      )}

      {privacy && <PrivacyDialog consent={consent} choose={choose} email={email} hasCheck={!!kb?.recaptchaSiteKey} onClose={() => setPrivacy(false)} />}
    </div>
  );
}

// Shared by every dialog: focus moves in and is trapped, Escape closes, focus returns to what opened it.
function useDialog(ref, onClose, focusRef) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const prev = document.activeElement;
    (focusRef?.current ?? ref.current)?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close.current();
      }
      if (e.key === "Tab" && ref.current) {
        const els = [...ref.current.querySelectorAll("button:not(:disabled), a[href], textarea, summary")];
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [ref, focusRef]);
}

function ChatModal({ onClose, messages, clear, busy, text, setText, send, maxChars, email, version, endRef, onVerdict, onPrivacy }) {
  const box = useRef(null);
  const input = useRef(null);
  useDialog(box, onClose, input);
  return (
    <div className="scrim chat-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section ref={box} className="chat-modal" role="dialog" aria-modal="true" aria-labelledby="chat-title">
        <header className="chat-head">
          <span className="mark" aria-hidden="true">S</span>
          <div>
            <h2 id="chat-title">Ask the helper</h2>
            <small>Written answers first. Short steps, plain words.</small>
          </div>
          <button type="button" className="btn ghost close" onClick={onClose} aria-label="Close the helper">
            <Icon name="close" />
          </button>
        </header>

        <div className="log" role="log" aria-live="polite" aria-relevant="additions">
          {messages.length === 0 && (
            <section className="hello">
              <h3>Ask me about SIWES</h3>
              <p>Letters, your logbook, your supervisor, or the defence.</p>
              <ul className="chips">
                {QUICK.map((t) => (
                  <li key={t.q}>
                    <button type="button" className="chip" onClick={() => send(t.q)}>
                      <Icon name={t.icon} /> {t.verb}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {messages.map((m) => (
            <Message key={m.id} m={m} email={email} version={version} onVerdict={onVerdict} onRetry={send} onPrivacy={onPrivacy} />
          ))}

          {busy && <StateBox kind="loading" title={busy} />}
          <div ref={endRef} />
        </div>

        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <p className="warn" id="pii">Don't type your matric number, phone number or address here.</p>
          <div className="row">
            <label htmlFor="ask" className="sr">Your question</label>
            <textarea
              id="ask"
              ref={input}
              rows={2}
              value={text}
              maxLength={maxChars}
              placeholder="Example: Where do I submit my acceptance letter?"
              aria-describedby="pii count"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(text);
                }
              }}
            />
            <button type="submit" className="btn primary" disabled={!text.trim() || !!busy}>
              Ask
            </button>
          </div>
          <div className="meta">
            <span id="count" className={text.length > maxChars - 40 ? "near" : ""}>{text.length}/{maxChars}</span>
            {messages.length > 0 && (
              <button type="button" className="link" onClick={clear}>Clear conversation</button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

function StateBox({ kind, title, children, action }) {
  return (
    <div className={`state ${kind}`} role={kind === "error" ? "alert" : "status"}>
      {kind === "loading" && <span className="dots" aria-hidden="true"><i /><i /><i /></span>}
      <div>
        <strong>{title}</strong>
        {children && <p>{children}</p>}
        {action && <button type="button" className="btn" onClick={action.run}>{action.label}</button>}
      </div>
    </div>
  );
}

function flagLink(email, topic, version) {
  const subject = encodeURIComponent(`SIWES Guide correction: ${topic}`);
  const body = encodeURIComponent(`Topic: ${topic}\nGuide version: ${version ?? ""}\n\nWhat looks wrong or out of date:\n`);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

function Message({ m, email, version, onVerdict, onRetry, onPrivacy }) {
  if (m.role === "user") {
    return <div className="msg user"><p>{m.text}</p></div>;
  }
  if (m.role === "error") {
    return (
      <StateBox kind="error" title="That didn't work" action={m.retry ? { label: "Try again", run: () => onRetry(m.retry) } : null}>
        {m.text}
      </StateBox>
    );
  }
  if (m.role === "notice") {
    return (
      <StateBox kind="notice" title="One thing first" action={m.action === "privacy" ? { label: "Open Privacy", run: onPrivacy } : null}>
        {m.text}
      </StateBox>
    );
  }
  if (m.role === "topic") {
    const s = m.seg;
    return (
      <article className="msg card">
        <Label tone="doc">Topic · {s.title}</Label>
        <p>{s.blurb}</p>
        {s.steps.length > 0 && (
          <>
            <h3>Steps</h3>
            <ol>{s.steps.map((st, i) => <li key={i}>{st}</li>)}</ol>
          </>
        )}
        <p className="hint">Type your question below if you need more.</p>
        <Flag href={flagLink(email, s.title, version)} />
      </article>
    );
  }
  if (m.role === "doc") {
    const d = m.doc;
    return (
      <article className="msg card doc">
        <Label tone="doc">Read this · {d.source}</Label>
        <h3>{d.title}</h3>
        <p>{d.body}</p>
        {d.steps.length > 0 && (
          <details>
            <summary>Steps for {d.segment.title}</summary>
            <ol>{d.steps.map((st, i) => <li key={i}>{st}</li>)}</ol>
          </details>
        )}
        <p className="hint">{d.confirm}</p>
        {m.verdict === null ? (
          <div className="verdict" role="group" aria-label="Was this helpful?">
            <strong>Was this helpful?</strong>
            <button type="button" className="btn" onClick={() => onVerdict(m, true)}>Yes</button>
            <button type="button" className="btn" onClick={() => onVerdict(m, false)}>No, ask the helper</button>
          </div>
        ) : (
          <p className="thanks" role="status">{m.verdict === "yes" ? "Glad that helped." : "Okay, asking the helper."}</p>
        )}
        <Flag href={flagLink(email, d.segment.title, version)} />
      </article>
    );
  }
  // bot
  const label =
    m.mode === "ai" ? "Helper's answer" : m.mode === "offline" ? "From the coordinator's notes" : "Not in my notes";
  return (
    <article className="msg card bot">
      <Label tone={m.mode === "none" ? "none" : "bot"}>{label}</Label>
      <Prose text={m.text} />
      {m.sources.length > 0 && (
        <p className="hint">
          Based on: {m.sources.map((s) => s.title).join(", ")}. Dates and fees can change, so confirm with the coordinator.
        </p>
      )}
      <Flag href={flagLink(email, m.sources[0]?.title ?? "General", version)} />
    </article>
  );
}

function Label({ tone, children }) {
  return <span className={`label ${tone}`}>{children}</span>;
}

function Flag({ href }) {
  return (
    <a className="flag" href={href}>
      <Icon name="flag" /> Flag a correction
    </a>
  );
}

function PrivacyDialog({ consent, choose, email, hasCheck, onClose }) {
  const ref = useRef(null);
  useDialog(ref, onClose);

  return (
    <div className="scrim top-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="ptitle">
        <h2 id="ptitle" tabIndex={-1} ref={ref}>Privacy</h2>
        <ul>
          <li>No login and no account. This site doesn't keep your chats.</li>
          <li>Please don't type your matric number, phone number or address. We try to remove obvious ones, but can't catch everything.</li>
          <li>Written answers come from our own notes. Only when you ask the helper is your question (after removing obvious personal details) sent to an AI service to write the answer.</li>
          <li>To keep bots out, the helper uses a Google security check, which receives signals such as your IP address under Google's terms. It loads only when you ask the helper, and only if you allow it.</li>
          <li>Your theme and this choice are saved in your own browser.</li>
          <li>Questions or requests about your data: {email}.</li>
        </ul>
        <p className="hint">Draft notice. The school will confirm the full details before launch.</p>
        <div className="consent-btns">
          {hasCheck && (
            <>
              <button type="button" className="btn" aria-pressed={consent === "no"} onClick={() => choose("no")}>Don't allow</button>
              <button type="button" className="btn" aria-pressed={consent === "yes"} onClick={() => choose("yes")}>Allow</button>
            </>
          )}
          <button type="button" className="btn primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
