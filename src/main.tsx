import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Deck, Embed, Print } from './Deck'
import { Presenter } from './Presenter'
import { scenes } from './scenes'
import './styles.css'

const mode = new URLSearchParams(location.search)
const view = mode.has('presenter') ? <Presenter /> : mode.has('embed') ? <Embed /> : mode.has('print') ? <Print /> : <Deck />
document.documentElement.dataset.mode = mode.has('presenter') ? 'presenter' : mode.has('print') ? 'print' : 'deck'

createRoot(document.getElementById('root')!).render(<StrictMode>{view}</StrictMode>)

// Every navigable position, for the capture script.
Object.assign(window, { __positions: scenes.flatMap(scene => Array.from({ length: scene.steps + 1 }, (_, step) => ({ id: scene.id, step }))) })
