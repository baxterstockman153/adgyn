"use client";

import { useRef, useState } from "react";
import { Button, Icon } from "./ui";

export type Contact = { id: string; email: string; name: string; groupIds: string[] };
export type Group = { id: string; name: string };

export const INITIAL_GROUPS: Group[] = [
  { id: "g-regulars", name: "Regulars" },
  { id: "g-vip", name: "VIPs" },
  { id: "g-events", name: "Events list" },
];

export const INITIAL_CONTACTS: Contact[] = [
  { id: "c1", email: "amara.lee@example.com", name: "Amara Lee", groupIds: ["g-regulars", "g-vip"] },
  { id: "c2", email: "devon.ray@example.com", name: "Devon Ray", groupIds: ["g-regulars"] },
  { id: "c3", email: "priya.n@example.com", name: "Priya Nair", groupIds: ["g-events"] },
  { id: "c4", email: "marcus.hall@example.com", name: "Marcus Hall", groupIds: ["g-regulars", "g-events"] },
  { id: "c5", email: "sofia.k@example.com", name: "Sofia Kim", groupIds: ["g-vip"] },
  { id: "c6", email: "wei.chen@example.com", name: "Wei Chen", groupIds: [] },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CONTACTS = 5000;

// Parse a pasted/uploaded CSV. Tolerant: any column order, comma/semicolon/tab
// separated, with or without a header. A row contributes a contact if it
// contains something that looks like an email; the first other non-email cell
// becomes the name.
function parseCsv(text: string): { email: string; name: string }[] {
  const out: { email: string; name: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = line.split(/[,;\t]/).map(cell => cell.trim().replace(/^"|"$/g, ""));
    const email = cells.find(cell => EMAIL_RE.test(cell));
    if (!email) continue;
    const name = cells.find(cell => cell && cell !== email && !EMAIL_RE.test(cell)) ?? "";
    out.push({ email: email.toLowerCase(), name });
  }
  return out;
}

export function AddressBook({ contacts, groups, onUpdate, notify }: {
  contacts: Contact[];
  groups: Group[];
  onUpdate: (patch: { contacts?: Contact[]; groups?: Group[] }) => void;
  notify: (message: string) => void;
}) {
  const [active, setActive] = useState("all"); // "all" | "ungrouped" | group id
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [addingContact, setAddingContact] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const groupCount = (id: string) => contacts.filter(contact => contact.groupIds.includes(id)).length;
  const ungrouped = contacts.filter(contact => contact.groupIds.length === 0).length;
  const inActive = (contact: Contact) => active === "all" ? true : active === "ungrouped" ? contact.groupIds.length === 0 : contact.groupIds.includes(active);
  const visible = contacts.filter(contact => inActive(contact) && (!query || `${contact.name} ${contact.email}`.toLowerCase().includes(query.toLowerCase())));
  const activeGroup = groups.find(group => group.id === active);

  function importRows(rows: { email: string; name: string }[]) {
    const assignTo = groups.some(group => group.id === active) ? [active] : [];
    const seen = new Set(contacts.map(contact => contact.email.toLowerCase()));
    const additions: Contact[] = [];
    for (const row of rows) {
      if (seen.has(row.email) || contacts.length + additions.length >= MAX_CONTACTS) continue;
      seen.add(row.email);
      additions.push({ id: crypto.randomUUID(), email: row.email, name: row.name, groupIds: assignTo });
    }
    if (!additions.length) { notify(rows.length ? "No new contacts — those emails are already in your address book." : "We couldn’t find any email addresses in that file."); return; }
    onUpdate({ contacts: [...additions, ...contacts] });
    const skipped = rows.length - additions.length;
    notify(`Imported ${additions.length} contact${additions.length === 1 ? "" : "s"}${assignTo.length ? ` into ${activeGroup?.name}` : ""}${skipped > 0 ? ` · skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}` : ""}.`);
  }

  function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2_000_000) { notify("That file is large — please upload a CSV under 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => importRows(parseCsv(String(reader.result ?? "")));
    reader.onerror = () => notify("We couldn’t read that file. Please try again.");
    reader.readAsText(file);
  }

  function toggle(id: string) {
    setSelected(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function addGroup() {
    const name = groupName.trim();
    if (!name) return;
    const group = { id: crypto.randomUUID(), name };
    onUpdate({ groups: [...groups, group] });
    setGroupName(""); setAddingGroup(false); setActive(group.id);
  }
  function deleteGroup(id: string) {
    if (!window.confirm("Delete this group? Contacts stay in your address book.")) return;
    onUpdate({ groups: groups.filter(group => group.id !== id), contacts: contacts.map(contact => ({ ...contact, groupIds: contact.groupIds.filter(gid => gid !== id) })) });
    setActive("all");
  }
  function addContact() {
    const email = newEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { notify("Please enter a valid email address."); return; }
    if (contacts.some(contact => contact.email.toLowerCase() === email)) { notify("That email is already in your address book."); return; }
    const assignTo = groups.some(group => group.id === active) ? [active] : [];
    onUpdate({ contacts: [{ id: crypto.randomUUID(), email, name: newName.trim(), groupIds: assignTo }, ...contacts] });
    setNewEmail(""); setNewName(""); setAddingContact(false); notify("Contact added.");
  }
  function bulkGroup(id: string, add: boolean) {
    onUpdate({ contacts: contacts.map(contact => selected.has(contact.id) ? { ...contact, groupIds: add ? Array.from(new Set([...contact.groupIds, id])) : contact.groupIds.filter(gid => gid !== id) } : contact) });
    notify(`${selected.size} contact${selected.size === 1 ? "" : "s"} ${add ? "added to" : "removed from"} ${groups.find(group => group.id === id)?.name}.`);
    setSelected(new Set());
  }
  function deleteSelected() {
    onUpdate({ contacts: contacts.filter(contact => !selected.has(contact.id)) });
    notify(`${selected.size} contact${selected.size === 1 ? "" : "s"} removed.`);
    setSelected(new Set());
  }

  return <>
    <div className="ss-heading"><div><div className="ss-eyebrow">Newsletter &amp; posts</div><h1>Address book</h1><p>Upload your list, organize it into groups, and reuse it when you send.</p></div><div className="ss-badge">{contacts.length} contact{contacts.length === 1 ? "" : "s"}</div></div>

    <div className="ss-ab-grid">
      <aside className="ss-ab-side">
        <button type="button" className="ss-ab-group" aria-pressed={active === "all"} onClick={() => setActive("all")}><span>All contacts</span><small>{contacts.length}</small></button>
        {groups.map(group => <button type="button" key={group.id} className="ss-ab-group" aria-pressed={active === group.id} onClick={() => setActive(group.id)}><span>{group.name}</span><small>{groupCount(group.id)}</small></button>)}
        <button type="button" className="ss-ab-group" aria-pressed={active === "ungrouped"} onClick={() => setActive("ungrouped")}><span>No group</span><small>{ungrouped}</small></button>
        {addingGroup
          ? <div className="ss-ab-newgroup"><input autoFocus value={groupName} maxLength={40} placeholder="Group name" onChange={event => setGroupName(event.target.value)} onKeyDown={event => { if (event.key === "Enter") addGroup(); if (event.key === "Escape") { setAddingGroup(false); setGroupName(""); } }} className="ss-ab-input" /><div className="ss-button-row" style={{ marginTop: 8 }}><Button variant="secondary" onClick={addGroup}>Add</Button><Button variant="quiet" onClick={() => { setAddingGroup(false); setGroupName(""); }}>Cancel</Button></div></div>
          : <button type="button" className="ss-ab-group ss-ab-newgroup" onClick={() => setAddingGroup(true)} style={{ color: "var(--ss-accent-deep)", fontWeight: 600 }}><span>+ New group</span></button>}
      </aside>

      <div>
        <div className={`ss-ab-import${dragging ? " drag" : ""}`}
          onDragOver={event => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => { event.preventDefault(); setDragging(false); readFile(event.dataTransfer.files[0]); }}>
          <div className="ss-type-icon ss-type-icon-link" style={{ width: 38, height: 38 }}><Icon name="download" size={18} /></div>
          <div className="t"><strong>Import a CSV</strong><small>Drop a file here or browse. We’ll read the name &amp; email columns.{groups.some(group => group.id === active) ? ` New contacts join ${activeGroup?.name}.` : ""}</small></div>
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" hidden onChange={event => { readFile(event.target.files?.[0]); event.target.value = ""; }} />
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>Browse…</Button>
        </div>

        <div className="ss-toolbar" style={{ marginBottom: 14 }}>
          <div className="ss-search"><input aria-label="Search contacts" placeholder={`Search ${activeGroup ? activeGroup.name : "contacts"}…`} value={query} onChange={event => setQuery(event.target.value)} /></div>
          <div className="ss-button-row">
            {activeGroup && <Button variant="quiet" onClick={() => deleteGroup(activeGroup.id)}><Icon name="close" size={14} /> Delete group</Button>}
            <Button variant="secondary" onClick={() => setAddingContact(value => !value)}><Icon name="plus" size={15} /> Add contact</Button>
          </div>
        </div>

        {addingContact && <div className="ss-card ss-card-pad" style={{ marginBottom: 14 }}><div className="ss-fields-two"><label className="ss-field"><span>Email</span><input type="email" value={newEmail} placeholder="name@email.com" onChange={event => setNewEmail(event.target.value)} /></label><label className="ss-field"><span>Name (optional)</span><input value={newName} placeholder="First Last" onChange={event => setNewName(event.target.value)} /></label></div><div className="ss-button-row"><Button onClick={addContact}>Add to address book</Button><Button variant="quiet" onClick={() => { setAddingContact(false); setNewEmail(""); setNewName(""); }}>Cancel</Button></div></div>}

        {selected.size > 0 && <div className="ss-bulkbar"><Icon name="check" size={15} /><span>{selected.size} selected</span><select aria-label="Add selected to group" defaultValue="" onChange={event => { if (event.target.value) bulkGroup(event.target.value, true); event.target.value = ""; }}><option value="" disabled>Add to group…</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select>{activeGroup && <button type="button" onClick={() => bulkGroup(activeGroup.id, false)}>Remove from {activeGroup.name}</button>}<button type="button" onClick={deleteSelected}>Delete</button><button type="button" className="sp" onClick={() => setSelected(new Set())}>Clear</button></div>}

        <div className="ss-card">
          {visible.length ? visible.map(contact => <div className="ss-contact" key={contact.id}>
            <input type="checkbox" checked={selected.has(contact.id)} aria-label={`Select ${contact.email}`} onChange={() => toggle(contact.id)} />
            <div className="av">{(contact.name || contact.email)[0]?.toUpperCase()}</div>
            <div className="who"><strong>{contact.name || contact.email}</strong>{contact.name && <small>{contact.email}</small>}</div>
            <div className="ss-gtags">{contact.groupIds.map(id => { const group = groups.find(item => item.id === id); return group ? <span className="ss-gtag" key={id}>{group.name}</span> : null; })}</div>
            <button type="button" className="ss-contact-x" aria-label={`Remove ${contact.email}`} onClick={() => onUpdate({ contacts: contacts.filter(item => item.id !== contact.id) })}><Icon name="close" size={14} /></button>
          </div>) : <div className="ss-empty"><Icon name="mail" size={30} /><h3>{contacts.length ? "No contacts here yet." : "Your address book is empty."}</h3><p>{contacts.length ? "Try another group or search." : "Import a CSV or add a contact to get started."}</p><Button variant="secondary" onClick={() => fileRef.current?.click()}>Import a CSV</Button></div>}
        </div>
      </div>
    </div>
  </>;
}
