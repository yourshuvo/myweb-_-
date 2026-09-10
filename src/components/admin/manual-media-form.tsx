"use client";

import { useActionState } from "react";
import { addManualMediaAction } from "@/app/admin/actions";

export function ManualMediaForm() {
  const [state, action, pending] = useActionState(addManualMediaAction, { status: "idle" as const, message: "" });
  return <form action={action} className="admin-form compact-form"><label><span>Hack Club CDN URL</span><input name="url" type="url" required placeholder="https://cdn.hackclub.com/…/photo.jpg" /></label><div className="form-grid"><label><span>Alt text</span><input name="altText" required maxLength={300} /></label><label><span>Caption</span><input name="caption" maxLength={500} /></label></div><label className="checkbox-label"><input name="showInPhotoLog" type="checkbox" defaultChecked /> Show on photo log</label>{state.message && <p className={`form-message ${state.status === "error" ? "is-error" : "is-success"}`} role="status">{state.message}</p>}<button className="retro-button" type="submit" disabled={pending}>{pending ? "Adding…" : "Add existing CDN image"}</button></form>;
}
