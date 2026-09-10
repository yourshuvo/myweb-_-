"use client";
/* eslint-disable @next/next/no-img-element -- Blob object URLs are local previews, not optimizable remote images. */

import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { W98Icon } from "@/components/desktop/w98-icon";
import { imageCompressionOptions } from "@/lib/image";

type UploadStatus = "idle" | "compressing" | "uploading" | "done" | "error";

export function FileUploader() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState("");

  const chooseFile = (next: File | undefined) => {
    if (!next) return;
    if (!next.type.startsWith("image/")) { setStatus("error"); setMessage("Choose an image file."); return; }
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setStatus("idle");
    setMessage("");
  };

  const clear = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(""); setStatus("idle"); setMessage("");
    if (input.current) input.current.value = "";
  };

  const upload = async (formData: FormData) => {
    if (!file) return;
    setStatus("compressing"); setMessage("Resizing and compressing in your browser…");
    try {
      const compressed = await imageCompression(file, imageCompressionOptions(file.type));
      const bitmap = await createImageBitmap(compressed);
      formData.set("file", compressed, compressed.name);
      formData.set("width", String(bitmap.width));
      formData.set("height", String(bitmap.height));
      bitmap.close();
      setStatus("uploading"); setMessage("Sending the optimized copy to Hack Club CDN…");
      const response = await fetch("/api/admin/media", { method: "POST", body: formData });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      setStatus("done"); setMessage("Uploaded. Refreshing the media library…");
      window.location.reload();
    } catch (error) {
      setStatus("error"); setMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  };

  return (
    <form action={upload} className="uploader-form">
      <div className={`retro-dropzone ${file ? "has-file" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }}>
        <input ref={input} id="photo-file" name="file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])} required />
        {preview ? <div className="upload-preview"><img src={preview} alt="Selected upload preview" /><button type="button" aria-label="Remove selected file" onClick={clear}>×</button></div> : <label htmlFor="photo-file"><span><W98Icon icon="pictures" size={32} /></span><strong>Drop a photograph here</strong><small>or click to browse. JPEG, PNG, or WebP.</small></label>}
      </div>
      {file && <div className="selected-file"><W98Icon icon="camera" size={16} /><div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB before optimization</small></div></div>}
      <div className="form-grid"><label><span>Alt text <b>*</b></span><input name="altText" required maxLength={300} placeholder="Describe what is visible" /></label><label><span>Caption</span><input name="caption" maxLength={500} placeholder="Optional context" /></label></div>
      <div className="form-grid"><label><span>Date taken</span><input name="takenDate" type="date" /></label><label className="checkbox-label"><input name="showInPhotoLog" type="checkbox" defaultChecked /> Show on the public photo log</label></div>
      {message && <p className={`form-message ${status === "error" ? "is-error" : ""}`} role="status">{message}</p>}
      <button className="retro-button" type="submit" disabled={!file || status === "compressing" || status === "uploading"}>{status === "compressing" ? "Optimizing…" : status === "uploading" ? "Uploading…" : "Upload optimized copy"}</button>
      <p className="form-help">Images are resized to at most 2400px and compressed below 4 MB before leaving your browser. Original full-size files are not retained.</p>
    </form>
  );
}
