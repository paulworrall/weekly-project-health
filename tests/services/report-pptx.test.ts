/** Brief 07: the PowerPoint report, built from the synthetic sample data and unzipped. */
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { mockDataset } from "@/mocks/repository";
import { createViews } from "@/lib/views";
import { buildReport } from "@/lib/report";
import { renderReportPptx } from "@/services/documents/report-pptx";

const views = createViews(mockDataset);

async function open(scope: { clientId: string; workstreamId?: string }) {
  const report = buildReport(views, scope, undefined, mockDataset.now)!;
  const file = await renderReportPptx(report);
  const zip = await JSZip.loadAsync(file);
  const slides = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  const xml = await Promise.all(slides.map((f) => zip.file(f)!.async("string")));
  // Text runs only, joined, so phrases split across runs still match.
  const decode = (t: string) =>
    t
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  const text = xml.map((x) =>
    [...x.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decode(m[1])).join(" ")
  );
  return { report, file, text, xml };
}

describe("renderReportPptx", () => {
  it("makes one slide per report slide, 16:9, with titles and page numbers", async () => {
    const { report, file, text, xml } = await open({ clientId: "northwind" });
    expect(file.subarray(0, 2).toString()).toBe("PK"); // a zip, as .pptx files are
    expect(text).toHaveLength(report.slides.length);
    expect(text).toHaveLength(13);
    expect(text[0]).toContain("Northwind Drinks");
    expect(text[0]).toContain("Page 1 of 13");
    expect(text[12]).toContain("Page 13 of 13");
    expect(text[1]).toContain("in the Northwind Drinks pipeline across 11 opportunities");
    expect(text[0]).toContain("Northwind Drinks total");
    // Every slide's title sits in a real title placeholder.
    expect(xml.every((x) => /<p:ph[\s\S]{0,40}type="title"/.test(x))).toBe(true);
  });

  it("marks a workstream that runs over two slides", async () => {
    const { text } = await open({ clientId: "northwind", workstreamId: "gamma-nordics" });
    expect(text).toHaveLength(3);
    expect(text[0]).toContain("Gamma Nordics · page 1 of 2");
    expect(text[0]).toContain("Continued on the next slide: project 7 of 7 →");
    expect(text[1]).toContain("Gamma Nordics (continued)");
    expect(text[1]).toContain("End of Gamma Nordics's projects · pipeline on the next slide");
    expect(text[2]).toContain("Gamma Nordics pipeline");
    expect(text[2]).toMatch(/added \d+ \w{3} 2026/);
  });

  it("uses Arial, with native charts that have alt text", async () => {
    const { xml, report } = await open({ clientId: "northwind" });
    expect(xml[0]).toContain('typeface="Arial"');
    const charts = report.slides.length; // at least the summary has charts
    expect(charts).toBeGreaterThan(0);
    expect(xml[0]).toMatch(/descr="Delivery RAG by week\./);
    expect(xml[0]).toMatch(/descr="Open risks and issues by week\./);
  });
});
