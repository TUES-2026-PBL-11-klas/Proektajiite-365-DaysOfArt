"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { Organization } from "@/lib/types";

type OrgFormState = {
  name: string;
  min_age: string;
  max_age: string;
  description: string;
};

const EMPTY_FORM: OrgFormState = {
  name: "",
  min_age: "",
  max_age: "",
  description: "",
};

const inputClass =
  "h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm text-[#18181b] outline-none focus:border-[#7c3aed]";
const textareaClass =
  "w-full border border-[#c8c2b6] bg-white px-3 py-2 text-sm text-[#18181b] outline-none focus:border-[#7c3aed]";

function toPayload(form: OrgFormState) {
  return {
    name: form.name,
    min_age: form.min_age === "" ? null : Number(form.min_age),
    max_age: form.max_age === "" ? null : Number(form.max_age),
    description: form.description || null,
  };
}

function CreateOrgForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState<OrgFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/organizations", {
        method: "POST",
        body: toPayload(form),
      });
      setForm(EMPTY_FORM);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 flex flex-col gap-3 border border-[#d8d3c7] bg-white p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c3aed]">
        Admin
      </p>
      <h2 className="text-lg font-semibold text-[#18181b]">
        Create new organization
      </h2>
      <input
        required
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className={inputClass}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          min={0}
          max={120}
          placeholder="Min. age"
          value={form.min_age}
          onChange={(e) => setForm({ ...form, min_age: e.target.value })}
          className={inputClass}
        />
        <input
          type="number"
          min={0}
          max={120}
          placeholder="Max. age"
          value={form.max_age}
          onChange={(e) => setForm({ ...form, max_age: e.target.value })}
          className={inputClass}
        />
      </div>
      <textarea
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        rows={2}
        className={textareaClass}
      />
      {error && (
        <p className="border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="self-start h-10 bg-[#7c3aed] px-4 text-sm font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Create"}
      </button>
    </form>
  );
}

function EditOrgForm({
  org,
  onSaved,
  onCancel,
}: {
  org: Organization;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<OrgFormState>({
    name: org.name,
    min_age: org.min_age?.toString() ?? "",
    max_age: org.max_age?.toString() ?? "",
    description: org.description ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/api/organizations/${org.id}`, {
        method: "PUT",
        body: toPayload(form),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 flex flex-col gap-3 border border-[#d8d3c7] bg-[#faf8f3] p-4"
    >
      <input
        required
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className={inputClass}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          min={0}
          max={120}
          placeholder="Min."
          value={form.min_age}
          onChange={(e) => setForm({ ...form, min_age: e.target.value })}
          className={inputClass}
        />
        <input
          type="number"
          min={0}
          max={120}
          placeholder="Max."
          value={form.max_age}
          onChange={(e) => setForm({ ...form, max_age: e.target.value })}
          className={inputClass}
        />
      </div>
      <textarea
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        rows={2}
        className={textareaClass}
      />
      {error && (
        <p className="border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="h-9 bg-[#7c3aed] px-4 text-sm font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-9 border border-[#c8c2b6] bg-white px-4 text-sm font-medium text-[#18181b] hover:border-[#7c3aed] hover:text-[#7c3aed]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function OrganizationsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [all, setAll] = useState<Organization[]>([]);
  const [mine, setMine] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [allRes, mineRes] = await Promise.all([
        apiFetch<{ organizations: Organization[] }>("/api/organizations"),
        apiFetch<{ organizations: Organization[] }>("/api/organizations/mine"),
      ]);
      setAll(allRes.organizations);
      setMine(mineRes.organizations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const memberIds = new Set(mine.map((o) => o.id));

  async function join(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/organizations/${id}/join`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Join failed");
    } finally {
      setBusyId(null);
    }
  }

  async function leave(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/organizations/${id}/leave`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Leave failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Are you sure you want to delete this organization?")) return;
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/organizations/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-[#f7f5ef] py-10">
      <div className="mx-auto max-w-3xl px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c3aed]">
          365 DaysOfArt
        </p>
        <h1 className="mt-1 mb-6 text-2xl font-semibold text-[#18181b]">
          Organizations
        </h1>

        {isAdmin && <CreateOrgForm onCreated={load} />}

        {error && (
          <p className="mb-4 border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
            {error}
          </p>
        )}
        {loading ? (
          <p className="text-sm text-[#71717a]">Loading…</p>
        ) : all.length === 0 ? (
          <p className="border border-dashed border-[#d8d3c7] bg-white px-5 py-8 text-center text-sm text-[#71717a]">
            {isAdmin
              ? "No organizations yet. Create the first one using the form above."
              : "No organizations have been created yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {all.map((org) => {
              const isMember = memberIds.has(org.id);
              const ageRange =
                org.min_age !== null || org.max_age !== null
                  ? `${org.min_age ?? "?"}–${org.max_age ?? "?"}`
                  : "all ages";
              return (
                <li
                  key={org.id}
                  className="border border-[#d8d3c7] bg-white px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-[#18181b]">{org.name}</p>
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#71717a]">
                        {ageRange}
                      </p>
                      {org.description && (
                        <p className="mt-2 text-sm leading-6 text-[#3f3f46]">
                          {org.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {isMember ? (
                        <button
                          onClick={() => leave(org.id)}
                          disabled={busyId === org.id}
                          className="h-9 border border-[#c8c2b6] bg-white px-3 text-sm font-medium text-[#18181b] hover:border-[#7c3aed] hover:text-[#7c3aed] disabled:opacity-60"
                        >
                          {busyId === org.id ? "…" : "Leave"}
                        </button>
                      ) : (
                        <button
                          onClick={() => join(org.id)}
                          disabled={busyId === org.id}
                          className="h-9 bg-[#7c3aed] px-3 text-sm font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-60"
                        >
                          {busyId === org.id ? "…" : "Join"}
                        </button>
                      )}
                      {isAdmin && (
                        <div className="flex gap-3">
                          <button
                            onClick={() =>
                              setEditingId(editingId === org.id ? null : org.id)
                            }
                            className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c3aed] hover:text-[#6d28d9]"
                          >
                            {editingId === org.id ? "Cancel" : "Edit"}
                          </button>
                          <button
                            onClick={() => remove(org.id)}
                            disabled={busyId === org.id}
                            className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b91c1c] hover:text-[#7f1d1d] disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {isAdmin && editingId === org.id && (
                    <EditOrgForm
                      org={org}
                      onSaved={() => {
                        setEditingId(null);
                        load();
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function OrganizationsPage() {
  return (
    <AuthGuard>
      <OrganizationsContent />
    </AuthGuard>
  );
}
