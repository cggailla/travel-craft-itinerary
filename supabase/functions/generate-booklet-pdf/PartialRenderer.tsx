// PartialRenderer.tsx - builds a minimal Document for a single section
import React from 'npm:react@18.2.0'
import ReactPDF from 'npm:@react-pdf/renderer@3.4.3'
import { Document, Page } from 'npm:@react-pdf/renderer@3.4.3'

import BookletDocument, { Cover, Itinerary, ThankYou, GeneralInfo, Emergency, Notes, PageFooter } from './BookletDocument.tsx'

export type SectionKey = 'cover' | 'step' | 'thank_you' | 'general_info' | 'emergency' | 'notes'

export function buildSectionElement(data: any, key: SectionKey, stepIndex?: number): React.ReactElement<any> {
  const cover = data.cover || {}
  const brand = {
    logoUrl: cover.logoUrl || data.brand?.logoUrl,
    agencyName: cover.agency || data.brand?.agencyName,
    reference: cover.reference || data.brand?.reference,
    travelers: cover.travelers || data.brand?.travelers,
  }

  switch (key) {
    case 'cover':
      return (
        <Document>
          <Page size="A5" style={{ padding: 0, margin: 0 }}>
            <Cover cover={cover} brand={brand} />
          </Page>
        </Document>
      )
    case 'step': {
      const all = Array.isArray(data.itinerary) ? data.itinerary : []
      const one = (typeof stepIndex === 'number' && stepIndex >= 0 && stepIndex < all.length) ? [all[stepIndex]] : []
      return (
        <Document>
          <Page size="A5" style={{ fontSize: 11, padding: 40, backgroundColor: 'white' }}>
            <Itinerary itinerary={one} brand={brand} />
            <PageFooter />
          </Page>
        </Document>
      )
    }
    case 'thank_you':
      return (
        <Document>
          <Page size="A5" style={{ fontSize: 11, padding: 40, backgroundColor: 'white' }}>
            <ThankYou thank={data.thank_you || {}} brand={brand} />
            <PageFooter />
          </Page>
        </Document>
      )
    case 'general_info':
      return (
        <Document>
          <Page size="A5" style={{ fontSize: 11, padding: 40, backgroundColor: 'white' }}>
            <GeneralInfo info={data.general_info || {}} />
            <PageFooter />
          </Page>
        </Document>
      )
    case 'emergency':
      return (
        <Document>
          <Page size="A5" style={{ fontSize: 11, padding: 40, backgroundColor: 'white' }}>
            <Emergency contact={data.emergency_contacts || {}} />
            <PageFooter />
          </Page>
        </Document>
      )
    case 'notes':
      return (
        <Document>
          <Page size="A5" style={{ fontSize: 11, padding: 40, backgroundColor: 'white' }}>
            <Notes />
            <PageFooter />
          </Page>
        </Document>
      )
    default:
      // Fallback to full document if unknown key (shouldn't happen)
      return React.createElement(BookletDocument as any, { data })
  }
}

export async function renderSectionToBytes(data: any, key: SectionKey, stepIndex?: number): Promise<Uint8Array> {
  const element = buildSectionElement(data, key, stepIndex)
  // Try memory render first; fallback to file if needed
  try {
    // @ts-ignore react-pdf types
    const bytes = await ReactPDF.renderToBuffer(element)
    return bytes
  } catch (e) {
    console.warn('[PartialRenderer] renderToBuffer failed, trying file fallback:', (e as any)?.message)
    const tmp = `/tmp/section-${crypto.randomUUID()}.pdf`
    await ReactPDF.renderToFile(element, tmp)
    const buf = await Deno.readFile(tmp)
    await Deno.remove(tmp).catch(() => {})
    return buf
  }
}

