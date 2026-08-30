"use client";

import { useEffect, useRef, useState } from "react";

type LegalPdfAttachProps = {
  title: string;
  fileUrl: string;
  fileSize?: string;
};

function fileLabel(title: string, fileUrl: string) {
  const fromUrl = fileUrl.split("?")[0].split("/").pop() || "";
  if (fromUrl.toLowerCase().endsWith(".pdf")) {
    return `${title.replace(/\s+/g, "_")}.pdf`;
  }
  return fromUrl || `${title}.pdf`;
}

export default function LegalPdfAttach({ title, fileUrl, fileSize }: LegalPdfAttachProps) {
  const name = fileLabel(title, fileUrl);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderPreview() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const pdf = await pdfjs.getDocument({
          url: fileUrl,
          withCredentials: false,
        }).promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        const targetWidth = 520;
        const unscaled = page.getViewport({ scale: 1 });
        const scale = targetWidth / unscaled.width;
        const viewport = page.getViewport({ scale });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const context = canvas.getContext("2d");
        if (!context) return;

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise;

        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setReady(false);
      }
    }

    void renderPreview();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  return (
    <div className={`legal-pdf-attach${ready ? " is-ready" : ""}`}>
      <div className="legal-pdf-stage" aria-hidden="true">
        <div className="legal-pdf-fallback">
          <span className="legal-pdf-fallback-icon">PDF</span>
          <span className="legal-pdf-fallback-text">Document preview</span>
        </div>
        <canvas ref={canvasRef} className="legal-pdf-preview" />
      </div>

      <div className="legal-pdf-bar">
        <div className="legal-pdf-file-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1 7V3.5L18.5 9H15z" />
          </svg>
        </div>
        <div className="legal-pdf-meta">
          <p className="legal-pdf-name">{name}</p>
          <p className="legal-pdf-sub">
            PDF{fileSize ? ` · ${fileSize}` : ""}
          </p>
        </div>
        <a
          className="legal-pdf-action"
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Download ${title}`}
          download
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 4v12" />
            <path d="M7 11l5 5 5-5" />
            <path d="M5 20h14" />
          </svg>
        </a>
      </div>

      <a
        className="legal-pdf-hit"
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${title} PDF`}
      />
    </div>
  );
}
