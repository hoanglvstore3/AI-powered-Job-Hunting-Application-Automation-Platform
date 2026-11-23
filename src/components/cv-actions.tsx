// Tương tác phía client cho Giai đoạn 3 (FR-11/FR-13/FR-14): tạo CV tuỳ biến,
// đổi trạng thái job, duyệt / yêu cầu sửa / từ chối bản CV. Gọi API route
// (đã qua middleware đăng nhập), không chạm trực tiếp vào Sheet/Drive.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

/** FR-13: nút "Tạo CV tuỳ biến" trên trang chi tiết job. */
export function CvGenerateButton({ jobId }: { jobId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [result, setResult] = useState<{ docx_url: string; pdf_url: string; file_name: string; version: number } | null>(null);
  const [error, setError] = useState("");

  async function onClick() {
    setState("busy");
    setError("");
    const { status, data } = await postJson("/api/cv/generate", { job_id: jobId });
    if (status === 200 && data?.ok) {
      setResult({
        docx_url: data.docx_url,
        pdf_url: data.pdf_url,
        file_name: data.file_name,
        version: data.version,
      });
      setState("done");
    } else {
      setError(data?.error || "Tạo CV thất bại.");
      setState("error");
    }
  }

  if (state === "done" && result) {
    return (
      <div className="cv-result">
        <p>
          <strong>Đã tạo bản CV v{result.version}:</strong> {result.file_name}
        </p>
        <p>
          <a href={result.docx_url} target="_blank" rel="noreferrer">Tải DOCX</a>
          {" · "}
          <a href={result.pdf_url} target="_blank" rel="noreferrer">Tải PDF</a>
          {" · "}
          <a href="/cv">Xem ở trang CV</a>
        </p>
        <p className="muted">Trạng thái: Chờ duyệt · QA: Chờ @h1h6qabot đánh giá.</p>
      </div>
    );
  }
  return (
    <div>
      <button type="button" className="btn-primary" onClick={onClick} disabled={state === "busy"}>
        {state === "busy" ? "Đang tạo CV…" : "Tạo CV tuỳ biến cho job này"}
      </button>
      {state === "error" && <p className="error-text">{error}</p>}
      <p className="muted">
        Tạo bản DOCX + PDF từ CV gốc (chỉ dùng dữ kiện thật, §10), lưu lên Drive và ghi vào tab CV_Versions.
      </p>
    </div>
  );
}

/** FR-11: đổi trạng thái job, ghi ngược về Sheet. */
export function JobStatusChanger({ jobId, current }: { jobId: string; current: string }) {
  const [value, setValue] = useState(current);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const router = useRouter();

  async function onSave() {
    setState("busy");
    const { status } = await postJson(`/api/jobs/${encodeURIComponent(jobId)}/status`, { status: value });
    if (status === 200) {
      setState("done");
      router.refresh();
    } else {
      setState("error");
    }
  }

  return (
    <div className="status-changer">
      <select value={value} onChange={(e) => { setValue(e.target.value); setState("idle"); }}>
        {["Matched", "Interested", "Ignored", "Applied", "Interviewing", "Closed"].map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <button type="button" className="btn-outline" onClick={onSave} disabled={state === "busy" || value === current}>
        {state === "busy" ? "Đang lưu…" : "Lưu trạng thái"}
      </button>
      {state === "done" && <span className="ok-text">Đã lưu.</span>}
      {state === "error" && <span className="error-text">Lưu thất bại.</span>}
    </div>
  );
}

/** FR-14: duyệt / yêu cầu sửa / từ chối một bản CV trên trang CV. */
export function CvReviewButtons({ cvId, status }: { cvId: string; status: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  async function act(action: "approve" | "request-changes" | "reject") {
    setBusy(action);
    setError("");
    const { status: code, data } = await postJson(`/api/cv/${encodeURIComponent(cvId)}/review`, { action });
    setBusy(null);
    if (code === 200 && data?.ok) router.refresh();
    else setError(data?.error || "Không lưu được.");
  }

  if (status === "Đã duyệt" || status === "Từ chối") {
    return <p className="muted">Bản này đã {status === "Đã duyệt" ? "được duyệt" : "bị từ chối"}.</p>;
  }
  return (
    <div>
      <div className="btn-row">
        <button type="button" className="btn-primary" onClick={() => act("approve")} disabled={busy !== null}>
          {busy === "approve" ? "Đang lưu…" : "Duyệt CV này"}
        </button>
        <button type="button" className="btn-outline" onClick={() => act("request-changes")} disabled={busy !== null}>
          {busy === "request-changes" ? "Đang lưu…" : "Yêu cầu sửa lại"}
        </button>
        <button type="button" className="btn-danger" onClick={() => act("reject")} disabled={busy !== null}>
          {busy === "reject" ? "Đang lưu…" : "Từ chối"}
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
      <p className="muted">Chỉ CV ở trạng thái Đã duyệt mới đi tiếp sang tạo email nháp (Giai đoạn 4).</p>
    </div>
  );
}
