import React, { useEffect, useMemo, useState } from "react";
import uploadImage from "../../utils/uploadImage";

const UploadExample = () => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const allowedTypes = useMemo(
    () => ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    []
  );

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl]
  );

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    setFile(selectedFile || null);
    setResult(null);
    setError("");

    if (selectedFile) {
      const nextPreview = URL.createObjectURL(selectedFile);
      setPreviewUrl(nextPreview);
    } else {
      setPreviewUrl("");
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    setError("");

    if (!file) {
      setError("Choose a file before uploading.");
      return;
    }

    setUploading(true);
    try {
      const response = await uploadImage(file);
      setResult(response);
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || "Upload failed. Please try again.";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-12 px-4">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
            Cloudinary Upload Demo
          </p>
          <h1 className="text-3xl font-bold text-slate-900">Test the new upload endpoint</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            This example sends multipart form data to <code>/api/upload/image</code> which stores
            the file on Cloudinary and returns the secure URL and public_id. Use this as a template
            anywhere you need file uploads in the app.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form
            onSubmit={handleUpload}
            className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur"
          >
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-800">
                Choose a file to upload
              </label>
              <p className="text-xs text-slate-500">
                Allowed: JPG, PNG, WEBP, PDF. Max size depends on your Cloudinary plan.
              </p>
              <input
                type="file"
                accept={allowedTypes.join(",")}
                onChange={handleFileChange}
                className="mt-2 block w-full cursor-pointer rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-inner file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            {previewUrl && file?.type?.startsWith("image/") && (
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-600">Local preview</p>
                <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img
                    src={previewUrl}
                    alt="Selected file preview"
                    className="max-h-64 w-full object-contain"
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "Uploading..." : "Upload to Cloudinary"}
              </button>
              {file && (
                <span className="text-xs text-slate-500">
                  Selected: <strong className="text-slate-700">{file.name}</strong>
                </span>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {result && (
              <div className="mt-4 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
                <p className="font-semibold text-emerald-800">Upload successful</p>
                <div className="space-y-1">
                  <div className="text-slate-700">
                    <span className="font-semibold">URL:</span>{" "}
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 underline"
                    >
                      {result.url}
                    </a>
                  </div>
                  {result.public_id && (
                    <div className="text-slate-700">
                      <span className="font-semibold">public_id:</span> {result.public_id}
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>

          <aside className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-6 shadow-[0_16px_60px_rgba(79,70,229,0.08)]">
            <h2 className="text-lg font-semibold text-indigo-900">How it works</h2>
            <ul className="mt-3 space-y-2 text-sm text-indigo-800">
              <li>
                1. The form builds a <code>FormData</code> payload with a{" "}
                <code>file</code> field.
              </li>
              <li>
                2. <code>uploadImage</code> sends it to <code>/api/upload/image</code> via{" "}
                <code>axiosInstance</code>.
              </li>
              <li>
                3. The backend uses the Cloudinary storage config and returns{" "}
                <code>url</code> plus <code>public_id</code>.
              </li>
              <li>
                4. Use the returned URL wherever you need to persist the uploaded asset.
              </li>
            </ul>

            <div className="mt-4 rounded-xl bg-white/80 p-4 text-xs text-indigo-900 shadow-inner">
              <p className="font-semibold">Request payload</p>
              <pre className="mt-2 overflow-x-auto text-[11px] leading-relaxed">
{`POST ${import.meta.env.VITE_API_URL || ""}/api/upload/image
Content-Type: multipart/form-data
body: { file: <File> }`}
              </pre>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default UploadExample;
