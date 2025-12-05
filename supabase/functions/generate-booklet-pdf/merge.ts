// merge.ts - utilities to merge PDFs and add pagination using pdf-lib (Deno via npm)
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

export async function mergePdfBytes(buffers: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create()
  for (let i = 0; i < buffers.length; i++) {
    try {
      const src = await PDFDocument.load(buffers[i])
      const pages = await merged.copyPages(src, src.getPageIndices())
      pages.forEach((p) => merged.addPage(p))
    } catch (e) {
      console.error('[merge] Failed to load/merge part', i, (e as any)?.message)
      throw e
    }
  }
  return await merged.save()
}

export async function addPageNumbers(pdfBytes: Uint8Array, opts?: { x?: number; y?: number; size?: number; color?: { r: number; g: number; b: number } }): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  const total = pages.length
  const size = opts?.size ?? 9
  const color = opts?.color ? rgb(opts.color.r, opts.color.g, opts.color.b) : rgb(0.3, 0.3, 0.3)

  pages.forEach((page, i) => {
    const { width } = page.getSize()
    const text = `Page ${i + 1} / ${total}`
    const textWidth = font.widthOfTextAtSize(text, size)
    const x = (opts?.x ?? (width - textWidth - 40))
    const y = (opts?.y ?? 18)
    page.drawText(text, {
      x,
      y,
      size,
      font,
      color,
    })
  })

  return await doc.save()
}

