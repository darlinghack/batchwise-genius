import { jsPDF } from "jspdf";
import type { BatchInsightReport } from "./quiz.functions";

// Brand palette (mirrors the dashboard design tokens).
const PRIMARY: [number, number] = [79, 70, 229] as unknown as [number, number];
const C = {
  primary: [79, 70, 229] as [number, number, number],
  primaryDark: [55, 48, 163] as [number, number, number],
  text: [23, 25, 35] as [number, number, number],
  muted: [110, 118, 138] as [number, number, number],
  border: [226, 230, 240] as [number, number, number],
  accent: [238, 240, 253] as [number, number, number],
  warning: [217, 119, 6] as [number, number, number],
  track: [232, 235, 243] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const M = 46; // page margin
const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - M * 2;

function ellipsize(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && doc.getTextWidth(`${out}...`) > maxWidth) out = out.slice(0, -1);
  return `${out.trimEnd()}...`;
}

export function buildInsightPdf(report: BatchInsightReport, askedPrompt: string): jsPDF {
  void PRIMARY;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 0;

  const ensure = (needed: number) => {
    if (y + needed <= PAGE_H - 56) return;
    doc.addPage();
    y = M;
  };

  const setFont = (size: number, style: "normal" | "bold" = "normal", color = C.text) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
  };

  // ---- Header band ----
  doc.setFillColor(C.primary[0], C.primary[1], C.primary[2]);
  doc.rect(0, 0, PAGE_W, 104, "F");
  setFont(9, "bold", C.white);
  doc.text("DATAPRO QUIZHUB  ·  AI INSIGHTS REPORT", M, 38);
  setFont(19, "bold", C.white);
  doc.text(doc.splitTextToSize(report.headline, CONTENT_W), M, 62);
  setFont(9, "normal", C.white);
  doc.text(
    `${report.batchName}   ·   Generated ${new Date(report.generatedAt).toLocaleString()}`,
    M,
    88,
  );
  y = 132;

  // ---- Trainer question ----
  const question = askedPrompt.trim() || "Complete batch performance overview";
  const qLines = doc.splitTextToSize(question, CONTENT_W - 28);
  const qHeight = 34 + qLines.length * 13;
  doc.setFillColor(C.accent[0], C.accent[1], C.accent[2]);
  doc.roundedRect(M, y, CONTENT_W, qHeight, 8, 8, "F");
  setFont(8.5, "bold", C.primaryDark);
  doc.text("TRAINER QUESTION", M + 14, y + 18);
  setFont(10.5, "normal", C.text);
  doc.text(qLines, M + 14, y + 34);
  y += qHeight + 20;

  // ---- Answer ----
  const aLines = doc.splitTextToSize(report.answer, CONTENT_W);
  ensure(30 + aLines.length * 14);
  setFont(12, "bold", C.text);
  doc.text("Answer", M, y);
  y += 16;
  setFont(10.5, "normal", C.text);
  doc.text(aLines, M, y, { lineHeightFactor: 1.35 });
  y += aLines.length * 14 + 16;

  // ---- Stat cards ----
  const stats: [string, string][] = [
    ["Quizzes", String(report.stats.quizzes)],
    ["Submissions", String(report.stats.attempts)],
    ["Students", String(report.stats.students)],
    ["Average", `${report.stats.avg}%`],
    ["Pass rate", `${report.stats.passRate}%`],
  ];
  ensure(70);
  const gap = 10;
  const cardW = (CONTENT_W - gap * (stats.length - 1)) / stats.length;
  stats.forEach(([label, value], i) => {
    const x = M + i * (cardW + gap);
    doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
    doc.setFillColor(C.white[0], C.white[1], C.white[2]);
    doc.roundedRect(x, y, cardW, 54, 7, 7, "FD");
    setFont(8, "normal", C.muted);
    doc.text(label, x + 10, y + 19);
    setFont(15, "bold", C.text);
    doc.text(value, x + 10, y + 42);
  });
  y += 74;

  // ---- Bullet sections ----
  const bulletSection = (title: string, items: string[]) => {
    if (!items.length) return;
    ensure(46);
    setFont(12, "bold", C.text);
    doc.text(title, M, y);
    y += 15;
    setFont(10.5, "normal", C.text);
    items.forEach((item) => {
      const lines = doc.splitTextToSize(item, CONTENT_W - 16);
      ensure(lines.length * 13 + 6);
      doc.setTextColor(C.primary[0], C.primary[1], C.primary[2]);
      doc.text("•", M, y);
      doc.setTextColor(C.text[0], C.text[1], C.text[2]);
      doc.text(lines, M + 14, y, { lineHeightFactor: 1.3 });
      y += lines.length * 13 + 5;
    });
    y += 12;
  };

  bulletSection("Key findings", report.keyFindings);
  bulletSection("Strengths", report.strengths);
  bulletSection("Areas to improve", report.weaknesses);
  bulletSection("Recommendations", report.recommendations);

  // ---- Top performers ----
  if (report.topPerformers.length) {
    ensure(70);
    setFont(12, "bold", C.text);
    doc.text("Top performers", M, y);
    y += 14;
    const perRow = 3;
    const pw = (CONTENT_W - gap * (perRow - 1)) / perRow;
    report.topPerformers.forEach((s, i) => {
      const col = i % perRow;
      if (col === 0) ensure(52);
      const x = M + col * (pw + gap);
      doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
      doc.roundedRect(x, y, pw, 44, 7, 7, "D");
      setFont(10, "bold", C.text);
      doc.text(ellipsize(doc, `${i + 1}. ${s.name}`, pw - 18), x + 9, y + 18);
      setFont(8.5, "normal", C.muted);
      doc.text(`${s.avg}% average  ·  ${s.attempts} quizzes`, x + 9, y + 33);
      if (col === perRow - 1 || i === report.topPerformers.length - 1) y += 44 + gap;
    });
    y += 14;
  }

  // ---- Weakest topics with bars ----
  if (report.weakTopics.length) {
    ensure(50);
    setFont(12, "bold", C.text);
    doc.text("Weakest topics", M, y);
    y += 18;
    report.weakTopics.forEach((t) => {
      ensure(22);
      setFont(9.5, "normal", C.text);
      doc.text(ellipsize(doc, t.topic, 150), M, y + 8);
      const barX = M + 160;
      const barW = CONTENT_W - 160 - 44;
      doc.setFillColor(C.track[0], C.track[1], C.track[2]);
      doc.roundedRect(barX, y + 1, barW, 8, 4, 4, "F");
      doc.setFillColor(C.warning[0], C.warning[1], C.warning[2]);
      const fill = Math.max(2, (barW * Math.min(100, t.accuracy)) / 100);
      doc.roundedRect(barX, y + 1, fill, 8, 4, 4, "F");
      setFont(9, "normal", C.muted);
      doc.text(`${t.accuracy}%`, PAGE_W - M, y + 8, { align: "right" });
      y += 18;
    });
    y += 12;
  }

  // ---- Hardest questions ----
  if (report.weakQuestions.length) {
    ensure(46);
    setFont(12, "bold", C.text);
    doc.text("Hardest questions", M, y);
    y += 16;
    report.weakQuestions.forEach((q) => {
      const lines = doc.splitTextToSize(q.question, CONTENT_W - 60);
      ensure(lines.length * 13 + 20);
      setFont(9.5, "bold", C.warning);
      doc.text(`${q.accuracy}%`, M, y);
      setFont(10, "normal", C.text);
      doc.text(lines, M + 42, y, { lineHeightFactor: 1.3 });
      y += lines.length * 13;
      setFont(8.5, "normal", C.muted);
      doc.text(q.quiz, M + 42, y + 6);
      y += 26;
    });
  }

  // ---- Footers ----
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
    doc.line(M, PAGE_H - 42, PAGE_W - M, PAGE_H - 42);
    setFont(8, "normal", C.muted);
    doc.text(`Datapro QuizHub · ${report.batchName}`, M, PAGE_H - 28);
    doc.text(`Page ${p} of ${pages}`, PAGE_W - M, PAGE_H - 28, { align: "right" });
  }

  return doc;
}

export function insightPdfFileName(batchName: string): string {
  const slug = batchName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return `${slug || "batch"}-ai-insights.pdf`;
}
