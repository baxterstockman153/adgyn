"use client";

import { useEffect, useState, useTransition } from "react";
import {
  updateProspectStatus,
  saveProspectNote,
  markOutreachOpened,
  sendProspectEmail,
} from "./actions";

type Status = "new" | "contacted" | "interested" | "won" | "lost";

type Reply = {
  id: string;
  fromEmail: string;
  subject: string | null;
  text: string | null;
  receivedAt: string;
};

type Prospect = {
  id: string;
  businessName: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  contactName: string | null;
  contactTitle: string | null;
  email: string | null;
  notes: string;
  outreachMessage: string | null;
  status: Status;
  replies: Reply[];
};

const STAGES: { value: Status; label: string; dot: string; chip: string }[] = [
  { value: "new", label: "New", dot: "bg-gray-400", chip: "bg-gray-100 text-gray-600" },
  { value: "contacted", label: "Contacted", dot: "bg-blue-400", chip: "bg-blue-100 text-blue-700" },
  { value: "interested", label: "Interested", dot: "bg-purple-400", chip: "bg-purple-100 text-purple-700" },
  { value: "won", label: "Won", dot: "bg-green-500", chip: "bg-green-100 text-green-700" },
  { value: "lost", label: "Lost", dot: "bg-red-400", chip: "bg-red-100 text-red-600" },
];

// Fallback pitch when we haven't written a custom message for a prospect.
function defaultMessage(venueName: string, p: Prospect): string {
  const first = p.contactName?.trim().split(/\s+/)[0];
  const greeting = first ? `Hi ${first},` : "Hi there,";
  const who = p.businessName;
  return `${greeting}

I'm reaching out from ${venueName} — a local coffee spot right around the corner from ${who}. We feature a handful of nearby businesses on our coffee sleeves, and I think ${who} would be a great fit to get in front of our regulars.

Would you be open to a quick chat about featuring your business on our next run?

Thanks,
${venueName}`;
}

export function OutreachBoard({
  venueName,
  prospects: initial,
  sendEnabled,
  senderEmail,
}: {
  venueName: string;
  prospects: Prospect[];
  sendEnabled: boolean;
  senderEmail: string;
}) {
  const [prospects, setProspects] = useState(initial);

  // Record that the host opened their list — our "did they even look" signal.
  useEffect(() => {
    markOutreachOpened();
  }, []);

  const counts = STAGES.map((s) => ({
    ...s,
    count: prospects.filter((p) => p.status === s.value).length,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold">Outreach</h1>
        <p className="text-gray-500 text-sm mt-1">
          Local businesses worth inviting onto your sleeves. Reach out, then move
          each one along as you hear back.
        </p>
      </div>

      {/* Pipeline summary */}
      <div className="flex flex-wrap gap-2 mb-6">
        {counts.map((s) => (
          <div
            key={s.value}
            className="flex items-center gap-2 bg-white rounded-full border border-gray-200 px-3 py-1.5 text-sm"
          >
            <span className={`inline-block w-2 h-2 rounded-full ${s.dot}`} />
            <span className="text-gray-600">{s.label}</span>
            <span className="font-semibold">{s.count}</span>
          </div>
        ))}
      </div>

      {prospects.length === 0 ? (
        <section className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-gray-400">No prospects yet.</p>
          <p className="text-gray-300 text-sm mt-1">
            We&apos;ll add local businesses here for you to reach out to.
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {prospects.map((p) => (
            <ProspectCard
              key={p.id}
              venueName={venueName}
              prospect={p}
              sendEnabled={sendEnabled}
              senderEmail={senderEmail}
              onChange={(next) =>
                setProspects((list) =>
                  list.map((x) => (x.id === next.id ? next : x))
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProspectCard({
  venueName,
  prospect,
  sendEnabled,
  senderEmail,
  onChange,
}: {
  venueName: string;
  prospect: Prospect;
  sendEnabled: boolean;
  senderEmail: string;
  onChange: (p: Prospect) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(prospect.notes);
  const [copied, setCopied] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingSend, setConfirmingSend] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const stage = STAGES.find((s) => s.value === prospect.status)!;
  const message = prospect.outreachMessage?.trim() || defaultMessage(venueName, prospect);

  function changeStatus(status: Status) {
    if (status === prospect.status) return;
    setError(null);
    const prev = prospect.status;
    onChange({ ...prospect, status }); // optimistic
    startTransition(async () => {
      const res = await updateProspectStatus(prospect.id, status);
      if (!res.ok) {
        onChange({ ...prospect, status: prev }); // revert
        setError(res.error);
      }
    });
  }

  function copyMessage() {
    navigator.clipboard.writeText(message).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => setError("Couldn't copy — select the text and copy manually.")
    );
  }

  function saveNotes() {
    setError(null);
    setNoteSaved(false);
    startTransition(async () => {
      const res = await saveProspectNote(prospect.id, notes);
      if (res.ok) {
        onChange({ ...prospect, notes: notes.trim() });
        setNoteSaved(true);
        setTimeout(() => setNoteSaved(false), 1800);
      } else {
        setError(res.error);
      }
    });
  }

  function sendEmail() {
    setError(null);
    startTransition(async () => {
      const res = await sendProspectEmail(prospect.id);
      if (res.ok) {
        setConfirmingSend(false);
        setSent(true);
        if (res.movedToContacted) {
          onChange({ ...prospect, status: "contacted" });
        }
      } else {
        setConfirmingSend(false);
        setError(res.error);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${stage.dot}`} />
          <div className="min-w-0">
            <div className="font-medium truncate">{prospect.businessName}</div>
            <div className="text-xs text-gray-400 truncate">
              {[prospect.contactName, prospect.city].filter(Boolean).join(" · ") ||
                "No contact yet"}
            </div>
          </div>
        </button>
        {prospect.replies.length > 0 && (
          <span
            className="text-xs px-2 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700"
            title={`${prospect.replies.length} repl${prospect.replies.length === 1 ? "y" : "ies"}`}
          >
            💬 {prospect.replies.length}
          </span>
        )}
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${stage.chip}`}>
          {stage.label}
        </span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-gray-300 hover:text-gray-500 text-sm w-5 text-center"
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? "▲" : "▼"}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Contact details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Detail label="Contact">
              {prospect.contactName
                ? `${prospect.contactName}${prospect.contactTitle ? ` · ${prospect.contactTitle}` : ""}`
                : "—"}
            </Detail>
            <Detail label="Phone">
              {prospect.phone ? (
                <a href={`tel:${prospect.phone}`} className="text-purple-600 hover:text-purple-800">
                  {prospect.phone}
                </a>
              ) : "—"}
            </Detail>
            <Detail label="Email">
              {prospect.email ? (
                <a href={`mailto:${prospect.email}`} className="text-purple-600 hover:text-purple-800 break-all">
                  {prospect.email}
                </a>
              ) : "—"}
            </Detail>
            <Detail label="Website">
              {prospect.website ? (
                <a
                  href={/^https?:\/\//i.test(prospect.website) ? prospect.website : `https://${prospect.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-800 break-all"
                >
                  {prospect.website.replace(/^https?:\/\//, "")}
                </a>
              ) : "—"}
            </Detail>
            <Detail label="Address">
              {[prospect.address, prospect.city].filter(Boolean).join(", ") || "—"}
            </Detail>
          </div>

          {/* Outreach message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                Suggested message
              </span>
              <div className="flex items-center gap-2">
                {sendEnabled && prospect.email && (
                  <button
                    onClick={() => {
                      setError(null);
                      setConfirmingSend((c) => !c);
                    }}
                    disabled={pending || sent}
                    className="text-xs px-3 py-1.5 bg-purple-700 text-white rounded-lg font-medium hover:bg-purple-800 transition-colors disabled:opacity-50"
                  >
                    {sent ? "Sent ✓" : "Send email"}
                  </button>
                )}
                <button
                  onClick={copyMessage}
                  className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-100">
              {message}
            </pre>

            {confirmingSend && prospect.email && (
              <div className="mt-2 rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm">
                <p className="text-gray-700">
                  Send this message to{" "}
                  <span className="font-medium">{prospect.email}</span>?
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  From <span className="font-medium">{senderEmail}</span> · replies
                  come back to your inbox. Limit 100 emails/day.
                </p>
                <div className="flex items-center gap-2 mt-2.5">
                  <button
                    onClick={sendEmail}
                    disabled={pending}
                    className="text-xs px-3 py-1.5 bg-purple-700 text-white rounded-lg font-medium hover:bg-purple-800 transition-colors disabled:opacity-50"
                  >
                    {pending ? "Sending…" : "Send now"}
                  </button>
                  <button
                    onClick={() => setConfirmingSend(false)}
                    disabled={pending}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg font-medium text-gray-600 hover:bg-white transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Replies received to the venue's @adgyn.com inbox */}
          {prospect.replies.length > 0 && (
            <div>
              <span className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
                Replies
              </span>
              <div className="space-y-2">
                {prospect.replies.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-700 break-all">
                        {r.fromEmail}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(r.receivedAt).toLocaleString()}
                      </span>
                    </div>
                    {r.subject && (
                      <div className="text-xs text-gray-500 mt-0.5">{r.subject}</div>
                    )}
                    {r.text && (
                      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 mt-1.5">
                        {r.text.trim()}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status controls */}
          <div>
            <span className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
              Status
            </span>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => {
                const active = s.value === prospect.status;
                return (
                  <button
                    key={s.value}
                    onClick={() => changeStatus(s.value)}
                    disabled={pending}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                      active
                        ? "bg-gray-900 text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <span className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Add a note (e.g. 'called Tue, try again next week')"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <div className="flex items-center gap-3 mt-1.5">
              <button
                onClick={saveNotes}
                disabled={pending || notes === prospect.notes}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40"
              >
                Save note
              </button>
              {noteSaved && <span className="text-xs text-green-600">Saved</span>}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-gray-400">{label}: </span>
      <span className="text-gray-700">{children}</span>
    </div>
  );
}
