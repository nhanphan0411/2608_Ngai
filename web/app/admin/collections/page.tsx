"use client";

import { useEffect, useRef, useState } from "react";
import CollectionPhotoManager, {
  type CollectionPhotoManagerHandle,
} from "@/components/admin/CollectionPhotoManager";
import type { CollectionLayoutStyle } from "@/types/db";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const photoManagerRef = useRef<CollectionPhotoManagerHandle>(null);

  const emptyForm = {
    id: undefined as number | undefined,
    collection_name: "",
    collection_slug: "",
    description: "",
    status: "Draft",
    layout_style: "grid" as CollectionLayoutStyle,
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadCollections();
  }, []);

  async function loadCollections() {
    const res = await fetch("/api/admin/collections");
    const data = (await res.json()) as any[];
    setCollections(data);
  }

  function editCollection(collection: any) {
    setForm({ layout_style: "grid", ...collection });
  }

  function newCollection() {
    setForm(emptyForm);
  }

  // One button saves everything currently being edited: the collection's
  // own fields (including layout_style, toggled below) and, via the photo
  // manager's imperative handle, any staged editorial-photo changes. For a
  // brand-new collection there's no id yet to sync photos against, so the
  // collection is created first and the returned id is used for the photo
  // sync that follows.
  async function saveCollection() {
    setSaving(true);

    try {
      let id = form.id;

      if (!id) {
        const res = await fetch("/api/admin/collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const data = (await res.json()) as { id: number };
        id = data.id;
      } else {
        await fetch("/api/admin/collections", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }

      if (id && photoManagerRef.current?.hasUnsavedChanges()) {
        await photoManagerRef.current.save(id, form.collection_slug);
      }

      await loadCollections();
      newCollection();
    } finally {
      setSaving(false);
    }
  }

  // Layout style lives on the collection row but is toggled from within the
  // Photo Manager (right next to the preview it affects). It's just local
  // form state here — it's persisted, along with everything else, when the
  // save button below is clicked.
  function handleLayoutStyleChange(style: CollectionLayoutStyle) {
    setForm((f) => ({ ...f, layout_style: style }));
  }

  async function deleteCollection(id: number) {
    if (!confirm("Delete this collection?")) return;

    await fetch("/api/admin/collections", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    await loadCollections();

    if (form.id === id) newCollection();
  }

  const inputClass =
    "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const selectClass =
    "border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const labelClass = "mb-1 block text-xs font-medium text-gray-500";

  return (
    <div className="w-full">
      <div className="w-full">
        <h1 className="mb-5 text-xl max-sm:text-right font-semibold text-gray-900 sm:mb-6">
          Collections
        </h1>

        {/* ================= COLLECTIONS ================= */}

        <section className="mb-6 overflow-hidden border border-gray-200 bg-white shadow-sm sm:mb-8">
          <div className="border-b border-gray-100 px-4 py-3 sm:px-5 sm:py-4">
            <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
              Collections
            </h2>
          </div>

          {collections.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400 sm:p-8">
              No collections yet — create your first one below.
            </div>
          ) : (
            <>
              {/* ================= DESKTOP TABLE ================= */}

              <div className="hidden sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="p-3">ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Slug</th>
                      <th className="p-3">Layout</th>
                      <th className="p-3">Status</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {collections.map((c: any) => (
                      <tr
                        key={c.id}
                        className={`border-t border-gray-100 transition hover:bg-gray-50 ${form.id === c.id ? "bg-blue-50" : ""
                          }`}
                      >
                        <td className="p-3 text-gray-500">{c.id}</td>

                        <td className="p-3 font-medium text-gray-800">
                          {c.collection_name}
                        </td>

                        <td className="p-3 text-gray-500">
                          {c.collection_slug}
                        </td>

                        <td className="p-3 text-gray-500 capitalize">
                          {c.layout_style ?? "grid"}
                        </td>

                        <td className="p-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium ${c.status === "Active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                              }`}
                          >
                            {c.status}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => editCollection(c)}
                              className="border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteCollection(c.id)}
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
                {collections.map((c: any) => (
                  <div
                    key={c.id}
                    className={`p-4 transition ${form.id === c.id ? "bg-blue-50" : ""
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-medium text-gray-900">
                            {c.collection_name}
                          </h3>

                          <span
                            className={`shrink-0 px-2 py-0.5 text-[10px] font-medium ${c.status === "Active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                              }`}
                          >
                            {c.status}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-xs text-gray-500">
                          /{c.collection_slug} · {c.layout_style ?? "grid"} layout
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => editCollection(c)}
                          className="border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteCollection(c.id)}
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

      </div>

      {/* ================= EDIT SECTION ================= */}
      {/* Collection info and Editorial Photos live in one connected card —
          both are part of the same edit, and are saved together by the
          single button at the very end. Full-width (outside the div above)
          so the photo preview renders at the same width the real
          collection page would use. */}

      <section className="mb-8 border border-gray-200 bg-white shadow-sm sm:mb-12">
        <div className="p-4 sm:p-6">
          <div className="mb-4 sm:mb-5">
            <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
              {form.id ? "Edit Collection" : "New Collection"}
            </h2>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Collection Name</label>

              <input
                className={inputClass}
                value={form.collection_name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    collection_name: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className={labelClass}>Slug</label>

              <input
                className={inputClass}
                value={form.collection_slug}
                onChange={(e) =>
                  setForm({
                    ...form,
                    collection_slug: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="mb-4">
            <label className={labelClass}>Description</label>

            <textarea
              className={inputClass}
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className={labelClass}>Status</label>

            <select
              className={selectClass + " w-full"}
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value,
                })
              }
            >
              <option>Active</option>
              <option>Draft</option>
            </select>
          </div>
        </div>

        {/* Rendered even for a not-yet-created collection so photos can be
            staged up front — the save button below creates the collection
            and syncs these staged photos in one go. */}
        <div className="border-t border-gray-100 p-4 sm:p-6">
          <CollectionPhotoManager
            ref={photoManagerRef}
            collectionId={form.id}
            layoutStyle={form.layout_style ?? "grid"}
            onLayoutStyleChange={handleLayoutStyleChange}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:p-6">
          {form.id && (
            <button
              onClick={newCollection}
              className="w-full border border-gray-200 px-4 py-2.5 text-sm text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 sm:w-auto"
            >
              Cancel edit
            </button>
          )}

          <button
            onClick={saveCollection}
            disabled={saving}
            className="w-full bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving
              ? "Saving…"
              : form.id
                ? "Save Collection"
                : "Add New Collection"}
          </button>
        </div>
      </section>
    </div>
  );
}