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
      setError(err instanceof Error ? err.message : "Грешка при създаване");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="font-medium">Създай нова организация</h2>
      <input
        required
        placeholder="Име"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min={0}
          max={120}
          placeholder="Мин. възраст"
          value={form.min_age}
          onChange={(e) => setForm({ ...form, min_age: e.target.value })}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          type="number"
          min={0}
          max={120}
          placeholder="Макс. възраст"
          value={form.max_age}
          onChange={(e) => setForm({ ...form, max_age: e.target.value })}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <textarea
        placeholder="Описание (по избор)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        rows={2}
        className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {submitting ? "Запис…" : "Създай"}
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
      setError(err instanceof Error ? err.message : "Грешка при запис");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800"
    >
      <input
        required
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min={0}
          max={120}
          placeholder="Мин."
          value={form.min_age}
          onChange={(e) => setForm({ ...form, min_age: e.target.value })}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          type="number"
          min={0}
          max={120}
          placeholder="Макс."
          value={form.max_age}
          onChange={(e) => setForm({ ...form, max_age: e.target.value })}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <textarea
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        rows={2}
        className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {submitting ? "Запис…" : "Запази"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
        >
          Откажи
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
      setError(err instanceof Error ? err.message : "Грешка при зареждане");
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
      setError(err instanceof Error ? err.message : "Грешка при присъединяване");
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
      setError(err instanceof Error ? err.message : "Грешка при напускане");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Сигурен ли си че искаш да изтриеш тази организация?")) return;
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/organizations/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка при триене");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Организации</h1>

      {isAdmin && <CreateOrgForm onCreated={load} />}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-zinc-500">Зареждане…</p>
      ) : all.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {isAdmin
            ? "Все още няма организации. Създай първата от формата по-горе."
            : "Все още няма създадени организации."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {all.map((org) => {
            const isMember = memberIds.has(org.id);
            const ageRange =
              org.min_age !== null || org.max_age !== null
                ? `${org.min_age ?? "?"}–${org.max_age ?? "?"} г.`
                : "всички възрасти";
            return (
              <li
                key={org.id}
                className="rounded border border-zinc-200 px-4 py-3 dark:border-zinc-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-zinc-500">{ageRange}</p>
                    {org.description && (
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {org.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {isMember ? (
                      <button
                        onClick={() => leave(org.id)}
                        disabled={busyId === org.id}
                        className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
                      >
                        {busyId === org.id ? "…" : "Напусни"}
                      </button>
                    ) : (
                      <button
                        onClick={() => join(org.id)}
                        disabled={busyId === org.id}
                        className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-60 dark:bg-white dark:text-black"
                      >
                        {busyId === org.id ? "…" : "Присъедини се"}
                      </button>
                    )}
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setEditingId(editingId === org.id ? null : org.id)
                          }
                          className="text-xs underline"
                        >
                          {editingId === org.id ? "Откажи" : "Редактирай"}
                        </button>
                        <button
                          onClick={() => remove(org.id)}
                          disabled={busyId === org.id}
                          className="text-xs text-red-600 underline disabled:opacity-60"
                        >
                          Изтрий
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
  );
}

export default function OrganizationsPage() {
  return (
    <AuthGuard>
      <OrganizationsContent />
    </AuthGuard>
  );
}
