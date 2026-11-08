import { useEffect, useRef } from 'react'
import { RoadField, drawStatic } from './road/RoadField'
import type { FormName } from './road/forms'

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** The glyph mountain pass behind the stage; `dusk` goes from sunset (0) to night (1). `still` renders one static frame (print, previews). */
export function Field({ form, dusk, still = false }: { form: FormName; dusk: number; still?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const field = useRef<RoadField | null>(null)

  useEffect(() => {
    if (still || !canvas.current) return
    const instance = new RoadField(canvas.current, reducedMotion(), form, dusk)
    field.current = instance
    const resize = new ResizeObserver(() => instance.resize())
    resize.observe(canvas.current)
    return () => { resize.disconnect(); instance.dispose(); field.current = null }
    // The field is created once; later forms arrive through setForm.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still])

  useEffect(() => {
    if (!still) { field.current?.setForm(form, dusk); return }
    if (canvas.current) drawStatic(canvas.current, form, dusk)
  }, [form, dusk, still])

  return <canvas ref={canvas} className="field" aria-hidden="true" />
}
