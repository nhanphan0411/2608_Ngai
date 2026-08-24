"use client";

import { useEffect, useState } from "react";
import type { Document } from "@/types/db";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const emptyForm = {
    id: undefined as number | undefined,
    name: "",
    slug: "",
    content_markdown: "",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    const res = await fetch("/api/admin/documents");
    const data = (await res.json()) as Document[];
    setDocuments(data);
  }

  function editDocument(doc: Document) {
    setForm(doc);
    setSlugTouched(true);
    setError(null);
  }

  function newDocument() {
    setForm(emptyForm);
    setSlugTouched(false);
    setError(null);
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugTouched ? prev.slug : slugify(name),
    }));
  }

  async function saveDocument() {
    setSaving(true);
    setError(null);

    const method = form.id ? "PUT" : "POST";

    const res = await fetch("/api/admin/documents", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setSaving(false);
      return;
    }

    await loadDocuments();
    newDocument();
    setSaving(false);
  }

  async function deleteDocument(id: number) {
    if (!confirm("Delete this document? This can't be undone.")) return;

    await fetch("/api/admin/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    await loadDocuments();

    if (form.id === id) newDocument();
  }

  const inputClass =
    "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const labelClass = "mb-1 block text-xs font-medium text-gray-500";

  return (
    <div className="w-full">
      <h1 className="mb-5 text-xl max-sm:text-right font-semibold text-gray-900 sm:mb-6">
        Documents
      </h1>

      {/* ================= LIST ================= */}

      <section className="mb-6 overflow-hidden border border-gray-200 bg-white shadow-sm sm:mb-8">
        <div className="border-b border-gray-100 px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
            Documents
          </h2>
        </div>

        {documents.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400 sm:p-8">
            No documents yet — create your first one below.
          </div>
        ) : (
          <>
            {/* ================= DESKTOP TABLE ================= */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="p-3">Name</th>
                    <th className="p-3">URL</th>
                    <th className="p-3">Updated</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>

                <tbody>
                  {documents.map((d) => (
                    <tr
                      key={d.id}
                      className={`border-t border-gray-100 transition hover:bg-gray-50 ${
                        form.id === d.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="p-3 font-medium text-gray-800">{d.name}</td>

                      <td className="p-3 text-gray-500">
                        <a
                          href={`/pages/${d.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          /{d.slug}
                        </a>
                      </td>

                      <td className="p-3 text-gray-500">
                        {d.updated_at ? new Date(d.updated_at).toLocaleDateString() : "—"}
                      </td>

                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => editDocument(d)}
                            className="border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteDocument(d.id)}
                            className="border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ================= MOBILE LIST ================= */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {documents.map((d) => (
                <div
                  key={d.id}
                  className={`p-4 transition ${form.id === d.id ? "bg-blue-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-gray-900">{d.name}</h3>
                      <p className="mt-1 truncate text-xs text-blue-600">/{d.slug}</p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => editDocument(d)}
                        className="border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteDocument(d.id)}
                        className="border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ================= FORM ================= */}

      <section className="mb-8 border border-gray-200 bg-white p-4 shadow-sm sm:mb-12 sm:p-6">
        <div className="mb-4 sm:mb-5">
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
            {form.id ? "Edit Document" : "New Document"}
          </h2>
        </div>

        {error && (
          <div className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              placeholder="Terms of Service"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Slug</label>
            <input
              className={inputClass}
              placeholder="terms-of-service"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm({ ...form, slug: slugify(e.target.value) });
              }}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className={labelClass}>Content (Markdown)</label>
          <textarea
            className={inputClass + " font-mono"}
            rows={16}
            placeholder={"# Terms of Service\n\nWrite your document in markdown..."}
            value={form.content_markdown}
            onChange={(e) => setForm({ ...form, content_markdown: e.target.value })}
          />
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:mt-6 sm:flex-row sm:justify-end sm:gap-3">
          {form.id && (
            <button
              onClick={newDocument}
              className="w-full border border-gray-200 px-4 py-2.5 text-sm text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 sm:w-auto"
            >
              Cancel edit
            </button>
          )}

          <button
            onClick={saveDocument}
            disabled={saving}
            className="w-full bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50 sm:w-auto"
          >
            {saving ? "Saving…" : form.id ? "Update Document" : "Create Document"}
          </button>
        </div>
      </section>
    </div>
  );
}