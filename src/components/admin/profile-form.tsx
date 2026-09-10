"use client";
/* eslint-disable @next/next/no-img-element -- This control previews local blob URLs before the CDN upload completes. */

import { useActionState, useEffect, useId, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { saveProfileAction } from "@/app/admin/actions";
import type { MediaAsset } from "@/db/schema";
import { readJsonBody } from "@/lib/api-response";
import type { PublicProfile } from "@/lib/data";
import { imageCompressionOptions } from "@/lib/image";

type ProfileImageAsset = Pick<MediaAsset, "id" | "url" | "filename" | "altText">;
type UploadStatus = "idle" | "compressing" | "uploading" | "done" | "error";

function ProfileImagePicker({
  profile,
  media,
  onBusyChange,
}: {
  profile: PublicProfile;
  media: MediaAsset[];
  onBusyChange: (busy: boolean) => void;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<ProfileImageAsset[]>(media);
  const [avatarMediaId, setAvatarMediaId] = useState(profile.avatarMediaId || "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(profile.avatarUrl || "");
  const [altText, setAltText] = useState(
    media.find((asset) => asset.id === profile.avatarMediaId)?.altText ||
      (profile.displayName ? `Portrait of ${profile.displayName}` : "Profile portrait"),
  );
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function chooseFile(next: File | undefined) {
    if (!next) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      setStatus("error");
      setMessage("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setStatus("idle");
    setMessage("Ready to optimize and upload.");
  }

  function selectExisting(id: string) {
    const asset = assets.find((candidate) => candidate.id === id);
    setAvatarMediaId(id);
    setPreviewUrl(asset?.url || "");
    if (asset?.altText) setAltText(asset.altText);
    setFile(null);
    setStatus("idle");
    setMessage(id ? "Existing media selected. Save the profile to publish it." : "The profile image will be removed when you save.");
    if (input.current) input.current.value = "";
  }

  async function upload() {
    if (!file) return;
    if (!altText.trim()) {
      setStatus("error");
      setMessage("Add a short image description before uploading.");
      return;
    }

    onBusyChange(true);
    setStatus("compressing");
    setMessage("Optimizing the image in your browser...");
    try {
      const compressed = await imageCompression(file, imageCompressionOptions(file.type));
      const body = new FormData();
      body.append("file", compressed, compressed.name);
      body.append("altText", altText.trim());
      setStatus("uploading");
      setMessage("Uploading the optimized copy to Hack Club CDN...");
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const result = (await readJsonBody<{ asset?: ProfileImageAsset; error?: string }>(response)) ?? {};
      if (!response.ok || !result.asset) throw new Error(result.error || `Upload failed (status ${response.status}).`);

      const asset = result.asset;
      setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
      setAvatarMediaId(asset.id);
      setPreviewUrl(asset.url);
      setFile(null);
      if (input.current) input.current.value = "";
      setStatus("done");
      setMessage("Uploaded to Hack Club CDN and selected. Save the profile to publish it.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      onBusyChange(false);
    }
  }

  return (
    <fieldset className="profile-image-fieldset">
      <legend>Profile image</legend>
      <div className="profile-image-editor">
        <div className="profile-image-preview">
          {previewUrl ? <img src={previewUrl} alt="Profile image preview" /> : <span aria-hidden="true">?</span>}
        </div>
        <div className="profile-image-controls">
          <label>
            <span>Current image</span>
            <select name="avatarMediaId" value={avatarMediaId} onChange={(event) => selectExisting(event.target.value)}>
              <option value="">No profile image</option>
              {assets.map((asset) => <option value={asset.id} key={asset.id}>{asset.filename}</option>)}
            </select>
          </label>
          <input
            ref={input}
            id={inputId}
            className="profile-image-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose profile image"
            onChange={(event) => chooseFile(event.target.files?.[0])}
          />
          <div className="profile-image-actions">
            <button className="retro-button" type="button" onClick={() => input.current?.click()}>
              {file ? "Choose a different image..." : "Choose image..."}
            </button>
            <button className="retro-button" type="button" disabled={!file || status === "compressing" || status === "uploading"} onClick={upload}>
              {status === "compressing" ? "Optimizing..." : status === "uploading" ? "Uploading..." : "Upload to CDN"}
            </button>
          </div>
          {file && <p className="profile-image-file"><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB before optimization</span></p>}
          <label>
            <span>Image description {file && <b>*</b>}</span>
            <input value={altText} maxLength={300} disabled={!file} onChange={(event) => setAltText(event.target.value)} placeholder="Portrait of..." />
          </label>
          {message && <p className={`form-message profile-image-message ${status === "error" ? "is-error" : status === "done" ? "is-success" : ""}`} role="status" aria-live="polite">{message}</p>}
        </div>
      </div>
      <p className="form-help">JPEG, PNG, or WebP. The image is resized to at most 2400px, compressed below 4 MB, and stored on Hack Club CDN. It stays out of the public photo log.</p>
    </fieldset>
  );
}

export function ProfileForm({ profile, media, onboarding }: { profile: PublicProfile; media: MediaAsset[]; onboarding: boolean }) {
  const [state, action, pending] = useActionState(saveProfileAction, { status: "idle" as const, message: "" });
  const [imageUploading, setImageUploading] = useState(false);

  return (
    <form action={action} className="admin-form profile-form">
      {onboarding && <div className="setup-alert"><strong>First login setup</strong><p>Tell the public site who it belongs to. You can change every field later.</p></div>}
      <div className="form-grid">
        <label><span>Display name <b>*</b></span><input name="displayName" defaultValue={profile.displayName} required maxLength={80} /></label>
        <label><span>Site title <b>*</b></span><input name="siteTitle" defaultValue={profile.siteTitle} required maxLength={120} /></label>
      </div>
      <label><span>Biography</span><textarea name="biography" rows={8} defaultValue={profile.biography} maxLength={3000} placeholder="A few honest paragraphs about you..." /></label>
      <ProfileImagePicker profile={profile} media={media} onBusyChange={setImageUploading} />
      <label><span>Contact email</span><input name="contactEmail" type="email" defaultValue={profile.contactEmail} /></label>
      <fieldset><legend>Social links</legend><div className="form-grid"><label><span>Website</span><input name="website" type="url" defaultValue={profile.socialLinks.website} placeholder="https://" /></label><label><span>GitHub</span><input name="github" type="url" defaultValue={profile.socialLinks.github} placeholder="https://github.com/..." /></label><label><span>Instagram</span><input name="instagram" type="url" defaultValue={profile.socialLinks.instagram} placeholder="https://instagram.com/..." /></label><label><span>Mastodon</span><input name="mastodon" type="url" defaultValue={profile.socialLinks.mastodon} placeholder="https://.../@you" /></label></div></fieldset>
      <fieldset>
        <legend>Featured Spotify playlist</legend>
        <div className="form-grid">
          <label><span>Playlist title</span><input name="spotifyPlaylistTitle" defaultValue={profile.spotifyPlaylistTitle} maxLength={120} placeholder="What I am listening to" /></label>
          <label><span>Public playlist URL</span><input name="spotifyPlaylistUrl" type="url" defaultValue={profile.spotifyPlaylistUrl} placeholder="https://open.spotify.com/playlist/..." /></label>
        </div>
        <p className="form-help">Only public Spotify playlist links are accepted. Leave both fields empty to keep Music in its setup state.</p>
      </fieldset>
      {state.message && <p className={`form-message ${state.status === "error" ? "is-error" : "is-success"}`} role="status">{state.message}</p>}
      <div className="form-footer"><button className="retro-button" type="submit" disabled={pending || imageUploading}>{pending ? "Saving..." : imageUploading ? "Uploading image..." : onboarding ? "Finish setup" : "Save profile"}</button><span>Changes appear publicly right away.</span></div>
    </form>
  );
}
