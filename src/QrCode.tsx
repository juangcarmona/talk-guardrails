import { create } from 'qrcode'

// Drawn as crisp SVG modules so a phone at the back of the room can scan it.
export function QrCode({ value }: { value: string }) {
  const { modules } = create(value, { errorCorrectionLevel: 'M' })
  const size = modules.size
  const cells: string[] = []
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (modules.get(y, x)) cells.push(`M${x + 4} ${y + 4}h1v1h-1z`)
  return <svg className="qr" viewBox={`0 0 ${size + 8} ${size + 8}`} role="img" aria-label={`QR code for ${value}`} shapeRendering="crispEdges">
    <rect width={size + 8} height={size + 8} fill="#fff" />
    <path d={cells.join('')} fill="#0b1630" />
  </svg>
}
