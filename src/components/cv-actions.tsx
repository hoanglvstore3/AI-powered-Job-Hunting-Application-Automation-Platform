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
        <p className="muted">Trạng thái: Chờ duyệt · Bản Canva sẽ được worker chuẩn bị trong vài phút.</p>
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

/** Ô feedback cho một bản CV đã có bản Canva — Shu gửi feedback, worker Canva
    (cron canva-cv-worker-2m) áp dụng sửa rồi báo lại. Thay cho QA review (FR-20,
    đã bỏ theo ý Shu 19:23 ngày 23/11/2026). */
export function CvFeedbackForm({ cvId, canvaStatus }: { cvId: string; canvaStatus: string }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const router = useRouter();

  async function onSend() {
    if (!text.trim()) return;
    setState("busy");
    setError("");
    const { status, data } = await postJson(`/api/cv/${encodeURIComponent(cvId)}/feedback`, { feedback: text.trim() });
    if (status === 200 && data?.ok) {
      setText("");
      setState("done");
      router.refresh();
    } else {
      setError(data?.error || "Không gửi được feedback.");
      setState("error");
    }
  }

  if (canvaStatus === "Chờ sửa" || canvaStatus === "Đang sửa") {
    return (
      <p className="muted">
        Đã nhận feedback, DevBot đang cập nhật bản Canva này — xong sẽ báo lại.
      </p>
    );
  }

  return (
    <div>
      <label htmlFor={`fb-${cvId}`}><strong>Feedback cho bản Canva này:</strong></label>
      <textarea
        id={`fb-${cvId}`}
        rows={3}
        value={text}
        onChange={(e) => { setText(e.target.value); setState("idle"); }}
        placeholder="VD: đổi câu strengths thành nhấn mạnh kinh nghiệm Java, đưa Spring Boot lên đầu dòng Frameworks…"
        style={{ width: "100%", marginTop: 6 }}
      />
      <div className="btn-row" style={{ marginTop: 6 }}>
        <button type="button" className="btn-primary" onClick={onSend} disabled={state === "busy" || !text.trim()}>
          {state === "busy" ? "Đang gửi…" : "Gửi feedback"}
        </button>
      </div>
      {state === "done" && <p className="ok-text">Đã gửi feedback — DevBot sẽ cập nhật bản Canva trong vài phút.</p>}
      {state === "error" && <p className="error-text">{error}</p>}
      <p className="muted">Gửi xong, DevBot sửa trực tiếp trên bản Canva và cập nhật lại PDF, không cần QA duyệt.</p>
    </div>
  );
}

/** Ô nhập mô tả công việc (JD) cho một job — Shu dán JD xin được từ nhà tuyển
    dụng, web lưu vào tab Jobs (cột jd_text) và dùng thêm cùng bài post để
    phân tích (FR-12) + tuỳ biến lại CV cho khớp hơn. Nếu job đã có bản Canva
    hoàn thành thì worker sẽ tuỳ biến lại bản đó theo JD. */
export function JobDescriptionForm({ jobId, currentJd }: { jobId: string; currentJd: string }) {
  const [text, setText] = useState(currentJd || "");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [retaylor, setRetaylor] = useState(false);
  const router = useRouter();

  async function onSave() {
    setState("busy");
    setError("");
    setRetaylor(false);
    const { status, data } = await postJson(`/api/jobs/${encodeURIComponent(jobId)}/jd`, { jd_text: text.trim() });
    if (status === 200 && data?.ok) {
      setRetaylor(Boolean(data.retaylorTriggered));
      setState("done");
      router.refresh();
    } else {
      setError(data?.error || "Không lưu được JD.");
      setState("error");
    }
  }

  return (
    <div>
      <textarea
        rows={8}
        value={text}
        onChange={(e) => { setText(e.target.value); setState("idle"); }}
        placeholder="Dán toàn bộ mô tả công việc (JD) xin được từ nhà tuyển dụng vào đây — yêu cầu, kỹ năng, trách nhiệm, quyền lợi…"
        style={{ width: "100%" }}
      />
      <div className="btn-row" style={{ marginTop: 6 }}>
        <button type="button" className="btn-primary" onClick={onSave} disabled={state === "busy"}>
          {state === "busy" ? "Đang lưu…" : "Lưu JD"}
        </button>
      </div>
      {state === "done" && (
        <p className="ok-text">
          Đã lưu JD.
          {retaylor
            ? " DevBot sẽ tuỳ biến lại bản Canva theo JD trong vài phút."
            : " Phân tích CV và CV tạo sau sẽ dùng thêm JD này để khớp tốt hơn."}
        </p>
      )}
      {state === "error" && <p className="error-text">{error}</p>}
      <p className="muted">
        JD được lưu vào tab Jobs (cột jd_text) và dùng thêm cùng bài post để phân tích skill khớp/thiếu — CV chỉ tuỳ biến từ dữ kiện thật, không bịa thêm (§10).
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

/** Giai đoạn 4 (FR-15/FR-16): soạn + xem nội dung email ứng tuyển cho 1 job.
    Chỉ soạn content — Shu tự copy rồi gửi tay trong Gmail, website không đụng Gmail. */
export function EmailDraftSection({
  jobId,
  hasApprovedCv,
  existingDraft,
}: {
  jobId: string;
  hasApprovedCv: boolean;
  existingDraft: { email_to: string; email_subject: string; email_body: string; draft_status: string } | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [draft, setDraft] = useState(existingDraft);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  async function createDraft() {
    setState("busy");
    setError("");
    const res = await fetch(`/api/applications/${encodeURIComponent(jobId)}/draft`, { method: "POST" });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok && data.draft) {
      setDraft({ ...data.draft, draft_status: "Đã tạo draft" });
      setState("done");
      router.refresh();
    } else {
      setError(data?.error || "Soạn email thất bại.");
      setState("error");
    }
  }

  async function copyDraft() {
    if (!draft) return;
    const text = `To: ${draft.email_to}\nSubject: ${draft.email_subject}\n\n${draft.email_body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Không sao chép được — hãy bôi đen rồi copy tay.");
    }
  }

  async function markSent() {
    setState("busy");
    setError("");
    const res = await fetch(`/api/applications/${encodeURIComponent(jobId)}/sent`, { method: "POST" });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      setSent(true);
      setDraft((d) => (d ? { ...d, draft_status: "Đã gửi (tự gửi)" } : d));
      setState("done");
      router.refresh();
    } else {
      setError(data?.error || "Đánh dấu đã gửi thất bại.");
      setState("error");
    }
  }

  if (!hasApprovedCv && !draft) {
    return (
      <p className="muted">
        Chưa soạn được email: CV cho job này chưa được duyệt. Hãy duyệt bản CV ở trên trước,
        rồi quay lại đây soạn email ứng tuyển.
      </p>
    );
  }

  if (!draft) {
    return (
      <div>
        <p className="muted">
          CV đã duyệt. Bấm để soạn nội dung email ứng tuyển theo mẫu của anh
          (tiêu đề + nội dung, dùng skill khớp với job). Website chỉ soạn content — anh tự
          copy rồi gửi trong Gmail.
        </p>
        <button type="button" className="btn" onClick={createDraft} disabled={state === "busy"}>
          {state === "busy" ? "Đang soạn…" : "Soạn email ứng tuyển"}
        </button>
        {state === "error" && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <p>
        <strong>Tiêu đề:</strong> {draft.email_subject}
        <br />
        <strong>Tới:</strong> {draft.email_to}
        {draft.draft_status === "Đã gửi (tự gửi)" ? (
          <> · <span className="pill ok">Đã gửi</span></>
        ) : (
          <> · <span className="pill pending">Chưa gửi</span></>
        )}
      </p>
      <pre className="email-body">{draft.email_body}</pre>
      <p>
        <button type="button" className="btn" onClick={copyDraft}>
          {copied ? "Đã sao chép ✓" : "Sao chép nội dung"}
        </button>
        {" "}
        {draft.draft_status !== "Đã gửi (tự gửi)" && (
          <button type="button" className="btn-ghost" onClick={markSent} disabled={state === "busy"}>
            {sent ? "Đã đánh dấu đã gửi ✓" : "Đã gửi email (tự gửi trong Gmail)"}
          </button>
        )}
      </p>
      {state === "error" && <p className="error">{error}</p>}
      <p className="muted">
        Gửi xong trong Gmail thì bấm “Đã gửi email” để website ghi lại ngày ứng tuyển
        và chuyển job sang trạng thái Applied.
      </p>
    </div>
  );
}
