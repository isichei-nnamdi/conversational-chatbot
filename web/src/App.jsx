import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { captchaToken, chat, getKb, getStats, lookup, sendEvent } from "./api.js";
import { Prose } from "./markdown.jsx";
import { Icon } from "./Icon.jsx";

const QUICK = [
  { icon: "notebook", verb: "Get my logbook", q: "Where do I get my logbook?" },
  { icon: "file", verb: "Get my SIWES letter", q: "How do I generate my SIWES letter?" },
  { icon: "user", verb: "Supervisor not replying", q: "My supervisor is not replying. What do I do?" },
  { icon: "calendar", verb: "How long is SIWES?", q: "How long is SIWES?" },
];

const HOW = [
  { icon: "search", t: "Pick a question", d: "Or choose a topic." },
  { icon: "file", t: "Read the answer", d: "Short steps, in plain words." },
  { icon: "chat", t: "Still stuck? Ask the helper", d: "It only opens if the answer didn't help." },
];

// Where the click happened, so the reader can unfurl out of it.
const originOf = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  return `${Math.round(r.left + r.width / 2)}px ${Math.round(r.top + r.height / 2)}px`;
};

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

const fmtDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

// A topic can be opened from a link like /#topic=logbook.
const hashTopic = () => new URLSearchParams(location.hash.slice(1)).get("topic");

// The school's logo lives at web/public/miva-logo.png. Until that file exists the "S" mark shows instead.
function Logo() {
  const [ok, setOk] = useState(true);
  return ok ? (
    <img className="logo" src="/miva-logo.png" alt="Miva Open University" onError={() => setOk(false)} />
  ) : (
    <span className="mark" aria-hidden="true">S</span>
  );
}

let nextId = 1;
const id = () => nextId++;

export default function App() {
  const [kb, setKb] = useState(null);
  const [kbError, setKbError] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(null); // null | "Looking for a written answer…" | "Asking the helper…"
  const [chatOpen, setChatOpen] = useState(false);
  const [reader, setReader] = useState(null); // { kind: "loading" | "error" | "doc" | "topic", ... }
  const [rail, setRail] = useState(() => store.get("siwes.rail") === "1");
  const [privacy, setPrivacy] = useState(false);
  const [consent, setConsent] = useState(() => store.get("siwes.consent"));
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState(() => location.hash === "#stats");
  const endRef = useRef(null);

  const loadKb = useCallback(() => {
    setKbError(false);
    getKb().then(setKb).catch(() => setKbError(true));
  }, []);
  useEffect(loadKb, [loadKb]);

  const openSeg = useCallback((seg, origin) => {
    sendEvent("open", seg.id);
    window.history.replaceState(null, "", `#topic=${seg.id}`);
    setReader({ kind: "topic", seg, origin });
  }, []);

  // Open a shared link once the topics are in.
  useEffect(() => {
    const t = kb && hashTopic();
    const seg = t && kb.segments.find((s) => s.id === t);
    if (seg) openSeg(seg);
  }, [kb, openSeg]);

  useEffect(() => {
    const onHash = () => setStats(location.hash === "#stats");
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  const closeReader = useCallback(() => {
    setReader(null);
    if (hashTopic()) window.history.replaceState(null, "", location.pathname + location.search);
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    endRef.current?.scrollIntoView({ block: "end", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [messages, busy, chatOpen]);

  function toggleRail() {
    setRail((r) => {
      store.set("siwes.rail", r ? "0" : "1");
      return !r;
    });
  }

  const maxChars = kb?.maxChars ?? 500;
  const email = kb?.coordinatorEmail ?? "the SIWES coordinator";

  const add = (m) => setMessages((ms) => [...ms, { id: id(), ...m }]);

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

  async function ask(q) {
    setChatOpen(true);
    const mid = id();
    setMessages((ms) => [...ms, { id: mid, role: "user", text: q }]);
    await askBot(q, mid + 1);
  }

  // A written answer is shown in the reader. The helper is only reached when there is none, or the student says it didn't help.
  async function find(raw, from = "page", origin) {
    const q = raw.trim();
    if (!q || busy) return;
    setText("");
    if (from === "page") setReader({ kind: "loading", question: q, origin });
    else setBusy("Looking for a written answer…");
    let doc = null;
    try {
      doc = (await lookup(q)).doc;
    } catch (e) {
      setBusy(null);
      if (from === "page") setReader({ kind: "error", question: q, text: e.message, origin });
      else add({ role: "error", text: e.message, retry: q });
      return;
    }
    setBusy(null);
    if (doc) {
      setChatOpen(false);
      sendEvent("open", doc.segment.id);
      setReader({ kind: "doc", doc, question: q, verdict: null, origin });
    } else {
      setReader(null);
      await ask(q);
    }
  }

  function verdict(helpful) {
    sendEvent(helpful ? "yes" : "no", reader.doc.segment.id);
    if (helpful) {
      setReader((r) => ({ ...r, verdict: "yes" }));
    } else {
      const q = reader.question;
      closeReader();
      ask(q);
    }
  }

  function choose(v) {
    setConsent(v);
    store.set("siwes.consent", v);
  }

  const groups = useMemo(() => (kb ? kb.groups.map((g) => ({ g, items: kb.segments.filter((s) => s.group === g) })) : []), [kb]);

  const matches = useMemo(() => {
    const words = search.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    if (!kb || !words.length) return [];
    return kb.segments
      .filter((s) => words.every((w) => `${s.title} ${s.blurb}`.toLowerCase().includes(w)))
      .slice(0, 4);
  }, [kb, search]);

  const popular = (kb?.popular || []).map((pid) => kb.segments.find((s) => s.id === pid)).filter(Boolean);

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

  if (stats) return <Stats />;

  return (
    <div className={`shell${rail ? " rail" : ""}`}>
      <a className="skip" href="#main">Skip to the content</a>

      <header className="top">
        <div className="brand">
          <Logo />
          <strong>SIWES Guide</strong>
        </div>
        <div className="top-actions">
          <button type="button" className="btn ghost" onClick={() => setPrivacy(true)}>Privacy</button>
        </div>
      </header>

      <aside className="side">
        <button
          type="button"
          className="rail-toggle"
          onClick={toggleRail}
          aria-expanded={!rail}
          aria-controls="topics-nav"
          aria-label={rail ? "Show topic names" : "Hide topic names"}
          title={rail ? "Show topic names" : "Hide topic names"}
        >
          <Icon name="panel" />
          <span className="lbl">Topics</span>
        </button>
        <nav id="topics-nav" aria-label="Topics">
          {topicState}
          {groups.map(({ g, items }) => (
            <div key={g} className="navgroup">
              <h2>{g}</h2>
              <ul>
                {items.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="navitem"
                      onClick={(e) => openSeg(s, originOf(e))}
                      title={s.title}
                      aria-label={s.title}
                    >
                      <Icon name={s.icon} />
                      <span className="lbl">{s.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main className="page" id="main">
        <div className="page-inner">
          {kb?.deadlines?.length > 0 && (
            <ul className="deadlines" aria-label="Upcoming dates">
              {kb.deadlines.map((d) => (
                <li key={d.label + d.date}>
                  <Icon name="calendar" />
                  <span><strong>{d.label}</strong> · {fmtDate(d.date)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="page-head">
            <h1>What do you need help with?</h1>
            <p>Type a question, pick one below, or choose a topic.</p>
          </div>

          <form
            className="search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const q = search;
              setSearch("");
              find(q, "page", originOf({ currentTarget: e.currentTarget.querySelector("button") }));
            }}
          >
            <label htmlFor="q" className="sr">Search the guide</label>
            <Icon name="search" />
            <input
              id="q"
              type="search"
              value={search}
              maxLength={maxChars}
              placeholder="Example: Where do I submit my acceptance letter?"
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="btn primary" disabled={!search.trim() || !!busy}>Find</button>
          </form>
          {matches.length > 0 && (
            <ul className="matches" aria-label="Matching topics">
              {matches.map((s) => (
                <li key={s.id}>
                  <button type="button" className="navitem" onClick={(e) => openSeg(s, originOf(e))}>
                    <Icon name={s.icon} />
                    <span>{s.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <ul className="tiles">
            {QUICK.map((t) => (
              <li key={t.q}>
                <button type="button" className="tile" onClick={(e) => find(t.q, "page", originOf(e))}>
                  <span className="well"><Icon name={t.icon} /></span>
                  <strong>{t.verb}</strong>
                </button>
              </li>
            ))}
          </ul>

          {popular.length > 0 && (
            <section aria-labelledby="pop-h">
              <h2 id="pop-h" className="section-h">Most asked</h2>
              <ul className="chips">
                {popular.map((s) => (
                  <li key={s.id}>
                    <button type="button" className="chip" onClick={(e) => openSeg(s, originOf(e))}>
                      <Icon name={s.icon} /> {s.title}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="how" aria-labelledby="how-h">
            <h2 id="how-h" className="section-h">How it works</h2>
            <ol className="steps">
              {HOW.map((s, i) => (
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

          <details className="browse">
            <summary>All topics</summary>
            {topicState}
            {groups.map(({ g, items }) => (
              <div key={g} className="bgroup">
                <h3>{g}</h3>
                <ul>
                  {items.map((s) => (
                    <li key={s.id}>
                      <button type="button" className="navitem" onClick={(e) => openSeg(s, originOf(e))}>
                        <Icon name={s.icon} />
                        <span>{s.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </details>
        </div>
      </main>

      {!chatOpen && !reader && (
        <button type="button" className="launcher" onClick={() => setChatOpen(true)} aria-haspopup="dialog">
          <Icon name="chat" /> Ask the helper
        </button>
      )}

      {reader && (
        <Reader
          reader={reader}
          email={email}
          version={kb?.version}
          onClose={closeReader}
          onVerdict={verdict}
          onRetry={() => find(reader.question)}
          onHelper={() => {
            closeReader();
            setChatOpen(true);
          }}
          onSimple={(how) => {
            const topic = reader.kind === "doc" ? reader.doc.title : reader.seg.title;
            closeReader();
            ask(`Explain "${topic}" in ${how}. Keep it short.`);
          }}
        />
      )}

      {chatOpen && (
        <ChatModal
          onClose={() => setChatOpen(false)}
          messages={messages}
          clear={() => setMessages([])}
          busy={busy}
          text={text}
          setText={setText}
          send={(q) => find(q, "chat")}
          maxChars={maxChars}
          email={email}
          version={kb?.version}
          endRef={endRef}
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

function Reader({ reader, email, version, onClose, onVerdict, onRetry, onHelper, onSimple }) {
  const box = useRef(null);
  const first = useRef(null);
  useDialog(box, onClose, first);
  const doc = reader.kind === "doc" ? reader.doc : null;
  const seg = reader.kind === "topic" ? reader.seg : null;
  const title = doc ? doc.title : seg ? seg.title : "Looking for a written answer";
  const steps = doc ? doc.steps : seg ? seg.steps : [];
  return (
    <div className="scrim chat-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section
        ref={box}
        className="chat-modal reader"
        style={reader.origin ? { transformOrigin: reader.origin } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-title"
      >
        <header className="chat-head">
          <div>
            <h2 id="reader-title">{title}</h2>
            {(doc || seg) && <small>{doc ? `Read this · ${doc.source}` : "Topic"}</small>}
          </div>
          <button type="button" ref={first} className="btn ghost close" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>

        <div className="doc-body">
          {reader.kind === "loading" && <StateBox kind="loading" title="Looking for a written answer…" />}
          {reader.kind === "error" && (
            <StateBox kind="error" title="That didn't work" action={{ label: "Try again", run: onRetry }}>
              {reader.text}
            </StateBox>
          )}
          {(doc || seg) && (
            <>
              <p>{doc ? doc.body : seg.blurb}</p>
              {steps.length > 0 && (
                <>
                  <h3>Steps</h3>
                  <ol>{steps.map((st, i) => <li key={i}>{st}</li>)}</ol>
                </>
              )}
              {doc && <p className="hint">{doc.confirm}</p>}
              <p className="hint">Last confirmed {doc?.confirmed ?? confirmedOn(version)}.</p>
              <div className="reader-tools">
                <button type="button" className="link" onClick={() => window.print()}><Icon name="file" /> Print or save as PDF</button>
                <CopyLink id={doc ? doc.segment.id : seg.id} />
                <a className="flag" href={contactLink(email, reader.question ?? title, version)}><Icon name="mail" /> Contact the coordinator</a>
                <Flag href={flagLink(email, doc ? doc.segment.title : seg.title, version)} />
              </div>
              <div className="simple">
                <span>Read it differently:</span>
                <button type="button" className="chip" onClick={() => onSimple("simpler words")}>Simpler words</button>
                <button type="button" className="chip" onClick={() => onSimple("Nigerian Pidgin")}>Pidgin</button>
                <small>Written by the helper, not checked by the coordinator.</small>
              </div>
            </>
          )}
        </div>

        {doc && (
          <footer className="doc-foot">
            {reader.verdict === null ? (
              <div className="verdict" role="group" aria-label="Was this helpful?">
                <strong>Was this helpful?</strong>
                <button type="button" className="btn" onClick={() => onVerdict(true)}>Yes</button>
                <button type="button" className="btn" onClick={() => onVerdict(false)}>No, ask the helper</button>
              </div>
            ) : (
              <div className="verdict">
                <p className="thanks" role="status">Glad that helped.</p>
                <button type="button" className="btn primary" onClick={onClose}>Done</button>
              </div>
            )}
          </footer>
        )}
        {seg && (
          <footer className="doc-foot">
            <div className="verdict">
              <button type="button" className="btn" onClick={onHelper}><Icon name="chat" /> Still need help? Ask the helper</button>
            </div>
          </footer>
        )}
      </section>
    </div>
  );
}

function ChatModal({ onClose, messages, clear, busy, text, setText, send, maxChars, email, version, endRef, onPrivacy }) {
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
            <small>Short steps, plain words.</small>
          </div>
          <button type="button" className="btn ghost close" onClick={onClose} aria-label="Close the helper">
            <Icon name="close" />
          </button>
        </header>

        <div className="log" role="log" aria-live="polite" aria-relevant="additions">
          {messages.length === 0 && (
            <section className="hello">
              <h3>Ask me about SIWES</h3>
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
            <Message key={m.id} m={m} email={email} version={version} onRetry={send} onPrivacy={onPrivacy} />
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

function confirmedOn(version = "") {
  const [y, m] = version.split(".");
  return y && m ? new Date(Number(y), Number(m) - 1).toLocaleString("en-GB", { month: "long", year: "numeric" }) : "recently";
}

function contactLink(email, question, version) {
  const subject = encodeURIComponent("SIWES question");
  const body = encodeURIComponent(`Hello,\n\nI read the guide but I still need help with:\n${question}\n\nGuide version: ${version ?? ""}\n\n(Please do not add your matric number or phone number here unless the coordinator asks.)`);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

function CopyLink({ id }) {
  const [done, setDone] = useState(false);
  async function copy() {
    const url = `${location.origin}${location.pathname}#topic=${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }
  return (
    <button type="button" className="link" onClick={copy} aria-live="polite">
      <Icon name="route" /> {done ? "Link copied" : "Copy link"}
    </button>
  );
}

// Coordinator page at /#stats. Counts only; the key is kept in memory for this visit.
function Stats() {
  const [key, setKey] = useState("");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  async function load(e) {
    e.preventDefault();
    setErr("");
    try {
      setData(await getStats(key));
    } catch (x) {
      setErr(x.message);
    }
  }
  return (
    <main className="page stats" id="main">
      <div className="page-inner">
        <div className="page-head">
          <h1>Coordinator view</h1>
          <p>Counts only. No questions, no names, no devices.</p>
        </div>
        {!data ? (
          <form className="search" onSubmit={load}>
            <label htmlFor="k" className="sr">Coordinator key</label>
            <input id="k" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Coordinator key" autoComplete="off" />
            <button type="submit" className="btn primary" disabled={!key}>Show counts</button>
          </form>
        ) : (
          <div className="table-wrap">
            <table>
              <caption>Since {new Date(data.since).toLocaleString("en-GB")} (resets when the server restarts)</caption>
              <thead><tr><th>Topic</th><th>Opened</th><th>Helpful</th><th>Not helpful</th><th>"No" rate</th></tr></thead>
              <tbody>
                {[...data.topics].sort((a, b) => b.open - a.open).map((t) => (
                  <tr key={t.id}><td>{t.id}</td><td>{t.open}</td><td>{t.yes}</td><td>{t.no}</td><td>{t.yes + t.no ? `${t.noRate}%` : "-"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {err && <StateBox kind="error" title="Could not show counts">{err}</StateBox>}
        <p><a href="#main" onClick={() => { location.hash = ""; }}>Back to the guide</a></p>
      </div>
    </main>
  );
}

function flagLink(email, topic, version) {
  const subject = encodeURIComponent(`SIWES Guide correction: ${topic}`);
  const body = encodeURIComponent(`Topic: ${topic}\nGuide version: ${version ?? ""}\n\nWhat looks wrong or out of date:\n`);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

function Message({ m, email, version, onRetry, onPrivacy }) {
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
          <li>We count which topics are opened and whether they helped, with no link to you, so the coordinator can fix weak answers.</li>
          <li>Your browser may keep a copy of the topics so they open without a connection.</li>
          <li>This choice is saved in your own browser.</li>
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
