"use client";

import { useEffect, useState } from "react";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<any[]>([]);

  const emptyForm = {
    id: undefined as number | undefined,
    collection_name: "",
    collection_slug: "",
    description: "",
    status: "Active",
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
    setForm(collection);
  }

  function newCollection() {
    setForm(emptyForm);
  }

  async function saveCollection() {
    const method = form.id ? "PUT" : "POST";

    await fetch("/api/admin/collections", {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    await loadCollections();
    newCollection();
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
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const selectClass =
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const labelClass = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        Collections
      </h1>

      {/* ================= TABLE ================= */}

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm mb-8 overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Collections
          </h2>
        </div>

        {collections.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No collections yet — create your first one below.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="p-3">ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>

            <tbody>
              {collections.map((c: any) => (
                <tr
                  key={c.id}
                  className={`border-t border-gray-100 hover:bg-gray-50 transition ${
                    form.id === c.id ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="p-3 text-gray-500">
                    {c.id}
                  </td>

                  <td className="p-3 font-medium text-gray-800">
                    {c.collection_name}
                  </td>

                  <td className="p-3 text-gray-500">
                    {c.collection_slug}
                  </td>

                  <td className="p-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        c.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>

                  <td className="p-3">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => editCollection(c)}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteCollection(c.id)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ================= FORM ================= */}

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 mb-12">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {form.id ? "Edit Collection" : "New Collection"}
          </h2>

          {form.id && (
            <button
              onClick={newCollection}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>
              Collection Name
            </label>

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
            <label className={labelClass}>
              Slug
            </label>

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
          <label className={labelClass}>
            Description
          </label>

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

        <div className="mb-4">
          <label className={labelClass}>
            Status
          </label>

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

        <div className="flex justify-end mt-6">
          <button
            onClick={saveCollection}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition"
          >
            {form.id ? "Update Collection" : "Create Collection"}
          </button>
        </div>
      </section>
    </div>
  );
}