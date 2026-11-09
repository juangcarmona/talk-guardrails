import type { ReactNode } from 'react'
import { At, Plate, Term } from './components'
import { QrCode } from './QrCode'
import type { T } from './i18n'
import type { FormName } from './road/forms'

// The scene list mirrors content/outline.md. Wording on screen comes from the
// first Soft & Hard Guardrails deck in juangcarmona/presentations (commit 56b7388,
// the version given at the DevEx Chapter Roundtable), kept close to verbatim.

export type Scene = {
  id: string
  act: 0 | 1 | 2 | 3 | 4
  title: [en: string, es: string]
  steps: number
  layout: 'left' | 'center' | 'full' | 'cover'
  form: (step: number) => FormName
  content: (t: T) => ReactNode
}

export const acts: [string, string][] = [['', ''], ['I · The road', 'I · La carretera'], ['II · Paint', 'II · Pintura'], ['III · Barrier', 'III · Barrera'], ['IV · Black spot', 'IV · Punto negro']]

type Row = [head: string, body: ReactNode, code?: string]

/** Rows that reveal one per step, each with a coloured edge: blue for soft, red for hard. */
function List({ items, kind }: { items: Row[]; kind: 'soft' | 'hard' }) {
  return <ul className={`signs ${kind}`}>
    {items.map(([head, body, code], k) => <At key={head} at={k + 1} as="div" className="sign-row"><b>{head}</b><span>{body}{code && <code className="tag">{code}</code>}</span></At>)}
  </ul>
}

function Chips({ items, kind }: { items: string[]; kind: 'soft' | 'hard' }) {
  return <div className={`chips ${kind}`}>{items.map(item => <i key={item}>{item}</i>)}</div>
}

export const scenes: Scene[] = [
  {
    id: 'title', act: 0, title: ['Soft & Hard Guardrails', 'Guardarraíles blandos y duros'], steps: 0, layout: 'cover', form: () => 'road',
    content: t => <>
      <div className="title">
        <p className="eyebrow">{t('Guardrails for coding agents', 'Guardarraíles para agentes de código')}</p>
        {t('en', 'es') === 'en'
          ? <h1><span className="w-soft">Soft</span> <span className="amp">&amp;</span> <span className="w-hard">Hard</span><br />Guardrails</h1>
          : <h1>Guardarraíles<br /><span className="w-soft">blandos</span> <span className="amp">y</span> <span className="w-hard">duros</span></h1>}
        <p className="subtitle">{t('Guidance that steers. Enforcement that refuses.', 'Lo que guía. Lo que bloquea.')}</p>
      </div>
      <dl className="title-block">
        <div><dt>{t('Speaker', 'Ponente')}</dt><dd>Juan G. Carmona</dd></div>
        <div><dt>{t('Role', 'Puesto')}</dt><dd>Software Development Engineer · Plain Concepts</dd></div>
        <div><dt>{t('Event', 'Evento')}</dt><dd>DevEx Chapter Roundtable</dd></div>
        <div><dt>{t('Date', 'Fecha')}</dt><dd>2026</dd></div>
      </dl>
    </>,
  },
  {
    id: 'definition', act: 1, title: ['What are guardrails?', '¿Qué son los guardarraíles?'], steps: 0, layout: 'center', form: () => 'road',
    content: t => <div className="statement">
      <p className="eyebrow">{t('What are guardrails?', '¿Qué son los guardarraíles?')}</p>
      <h2 className="mid">{t('Guardrails are constraints that keep changes within acceptable boundaries', 'Los guardarraíles son restricciones que mantienen los cambios dentro de límites aceptables')}</h2>
      <p className="lead muted">{t('They can guide behavior or mechanically block violations.', 'Pueden guiar el comportamiento o bloquear mecánicamente las infracciones.')}</p>
    </div>,
  },
  {
    id: 'two-kinds', act: 1, title: ['Two kinds of guardrails', 'Dos tipos de guardarraíles'], steps: 2, layout: 'full', form: step => (['road', 'paint', 'barrier'] as const)[step],
    content: t => <>
      <h2>{t('Two kinds of guardrails', 'Dos tipos de guardarraíles')}</h2>
      <div className="pair">
        <At at={1} className="kind-card soft">
          <Plate kind="soft">{t('Soft', 'Blando')}</Plate><b>{t('Guides behavior', 'Guía el comportamiento')}</b>
          <span>{t('The rule exists, but nothing mechanically prevents you from ignoring it.', 'La regla existe, pero nada impide mecánicamente que la ignores.')}</span>
          <Chips kind="soft" items={[t('Warnings', 'Warnings'), t('Docs', 'Docs'), 'ADRs', t('Agent instructions', 'Instrucciones de agente'), t('Checklists', 'Checklists')]} />
        </At>
        <At at={2} className="kind-card hard">
          <Plate kind="hard">{t('Hard', 'Duro')}</Plate><b>{t('Blocks violations', 'Bloquea las infracciones')}</b>
          <span>{t('The tool refuses to continue when the rule is broken.', 'La herramienta se niega a continuar cuando se rompe la regla.')}</span>
          <Chips kind="hard" items={[t('Compiler', 'Compilador'), t('Analyzers', 'Analizadores'), 'Hooks', t('CI checks', 'Checks de CI'), t('Harness policies', 'Políticas del harness')]} />
        </At>
      </div>
    </>,
  },
  {
    id: 'soft-examples', act: 2, title: ['Examples of soft guardrails', 'Ejemplos de guardarraíles blandos'], steps: 5, layout: 'left', form: () => 'paint',
    content: t => <>
      <h2>{t('Examples of soft guardrails', 'Ejemplos de guardarraíles blandos')}</h2>
      <List kind="soft" items={[
        [t('Repository instructions', 'Instrucciones del repositorio'), <><code>CONTRIBUTING.md</code> · <code>AGENTS.md</code> · <code>CLAUDE.md</code> · <code>.github/copilot-instructions.md</code>. {t('Tell humans or agents how work should be done.', 'Dicen a personas o agentes cómo debe hacerse el trabajo.')}</>],
        [t('Architecture & product docs', 'Docs de arquitectura y producto'), t('ADRs, RFCs, architecture docs, product specs. They record decisions and boundaries, but do not enforce them.', 'ADR, RFC, docs de arquitectura, specs de producto. Registran decisiones y límites, pero no los imponen.')],
        [t('Warning-level rules', 'Reglas a nivel warning'), t('Surface violations without stopping execution.', 'Señalan la infracción sin detener la ejecución.')],
        [t('Prompts, skills & agent conventions', 'Prompts, skills y convenciones de agente'), t('Tell an agent what it should do, but depend on the agent following them.', 'Dicen al agente qué debe hacer, pero dependen de que el agente las siga.')],
        [t('Review checklists', 'Checklists de revisión'), t('Require a human to notice and act.', 'Necesitan que una persona se dé cuenta y actúe.')],
      ]} />
    </>,
  },
  {
    id: 'soft-practice', act: 2, title: ['Soft guardrails in practice', 'Guardarraíles blandos en la práctica'], steps: 1, layout: 'left', form: () => 'paint',
    content: t => <>
      <h2>{t('Soft guardrails in practice', 'Guardarraíles blandos en la práctica')}</h2>
      <table className="rules soft">
        <thead><tr><th>{t('Where', 'Dónde')}</th><th>{t('Rule', 'Regla')}</th></tr></thead>
        <tbody>
          <tr><td><code>AGENTS.md</code> / <code>CLAUDE.md</code></td><td>{t('“Use the repository service; never access the DB directly”', '«Usa el servicio de repositorio; nunca accedas directamente a la BD»')}</td></tr>
          <tr><td>{t('ADR / architecture docs', 'ADR / docs de arquitectura')}</td><td>{t('“Modules communicate through contracts”', '«Los módulos se comunican mediante contratos»')}</td></tr>
          <tr><td>{t('Linter configuration', 'Configuración del linter')}</td><td>{t('Rule configured as', 'Regla configurada como')} <code>WARN</code></td></tr>
          <tr><td>{t('Product / engineering docs', 'Docs de producto / ingeniería')}</td><td>{t('“Every endpoint requires authorization”', '«Todo endpoint requiere autorización»')}</td></tr>
          <tr><td>{t('PR checklist', 'Checklist de PR')}</td><td>{t('“Add tests for changed behavior”', '«Añade tests para el comportamiento que cambias»')}</td></tr>
        </tbody>
      </table>
      <At at={1}><p className="punch">{t('All of these rules may be perfectly documented.', 'Todas estas reglas pueden estar perfectamente documentadas.')}<br /><span className="w-hard">{t('None of them guarantees compliance.', 'Ninguna garantiza que se cumpla.')}</span></p></At>
    </>,
  },
  {
    id: 'refuses', act: 3, title: ['When the tool says no', 'Cuando la herramienta dice que no'], steps: 1, layout: 'center', form: () => 'barrier',
    content: t => <div className="statement">
      <p className="eyebrow"><Plate kind="soft">{t('Soft', 'Blando')}</Plate> → <Plate kind="hard">{t('Hard', 'Duro')}</Plate></p>
      <h2>{t('When the tool says no', 'Cuando la herramienta dice que no')}</h2>
      <p className="lead">{t('The rule becomes part of the execution.', 'La regla pasa a formar parte de la ejecución.')}</p>
      <At at={1}><p className="lead muted">{t('Soft depends on someone choosing to follow it: non-deterministic.', 'Lo blando depende de que alguien decida seguirlo: es indeterminista.')}<br />{t('Hard answers the same way every time: deterministic.', 'Lo duro responde igual cada vez: es determinista.')}</p></At>
    </div>,
  },
  {
    id: 'surfaces', act: 3, title: ['Four enforcement surfaces', 'Cuatro superficies de control'], steps: 5, layout: 'full', form: step => step >= 4 ? 'stop' : 'barrier',
    content: t => <>
      <h2>{t('Four enforcement surfaces', 'Cuatro superficies de control')}</h2>
      <ol className="surfaces compact">
        {([
          ['1 · Build', t('The build is rejected', 'La build se rechaza'), 'Roslyn analyzers, MSBuild reference guards, strict types, import-linter'],
          ['2 · Commit', t('The local change is rejected', 'El cambio local se rechaza'), t('Husky pre-commit, commitlint, secret scanning', 'Husky pre-commit, commitlint, detección de secretos')],
          ['3 · CI / Merge', t('The change cannot land', 'El cambio no puede entrar'), t('Required checks, adoption gates, drift validation, coverage floors', 'Checks obligatorios, puertas de adopción, validación de drift, mínimos de cobertura')],
          [t('4 · Agent harness', '4 · Harness del agente'), t('The agent is stopped', 'El agente se detiene'), t('Push gates, verdict checks, WIP caps, refusal logic in slash commands', 'Puertas de push, comprobación de veredictos, límites de WIP, lógica de rechazo en slash commands')],
        ] as const).map(([pk, head, body], k) => <At key={k} at={k + 1} as="div" className={`surface ${k === 3 ? 'agent' : ''}`}><small>{pk}</small><b>{head}</b><span>{body}</span></At>)}
      </ol>
      <At at={5} className="callout bottom">
        {t('en', 'es') === 'en'
          ? <p>Stages 1–3 stop bad <b>code</b>. Stage 4 stops the <b className="w-hard">agent</b>.<br /><span className="muted">Our harness can halt everything: workflows and processes have to be hard too.</span></p>
          : <p>Las etapas 1–3 paran el <b>código</b>. La 4 para al <b className="w-hard">agente</b>.<br /><span className="muted">Nuestro harness puede pararlo todo: los workflows y los procesos también tienen que ser duros.</span></p>}
      </At>
    </>,
  },
  {
    id: 'build', act: 3, title: ['1 · Build-time: the build fails', '1 · En build: la build falla'], steps: 0, layout: 'full', form: () => 'dim',
    content: t => <>
      <h2>{t('1 · Build-time: the build fails', '1 · En build: la build falla')}</h2>
      <table className="rules hard">
        <thead><tr><th>{t('Where', 'Dónde')}</th><th>{t('Rule', 'Regla')}</th><th>{t('Effect', 'Efecto')}</th></tr></thead>
        <tbody>
          <tr><td>{t('Compiler / type checker', 'Compilador / type checker')}</td><td><code>tsconfig.json</code> <code>"strict": true</code>, <code>mypy --strict</code>, {t('C# compiler errors', 'errores del compilador de C#')}</td><td>{t('A type error stops the build, not just the editor', 'Un error de tipos para la build, no solo el editor')}</td></tr>
          <tr><td>{t('Roslyn analyzers as errors', 'Analizadores Roslyn como error')}</td><td>{t('Module & layer isolation rules pinned to', 'Reglas de aislamiento de módulos y capas fijadas a')} <code>error</code></td><td>{t('The build fails the moment code crosses a boundary', 'La build falla en cuanto el código cruza una frontera')}</td></tr>
          <tr><td>{t('MSBuild reference guard', 'Guarda de referencias MSBuild')}</td><td><code>ArchVerifyModuleReferences</code></td><td>{t('An illegal', 'Una referencia')} <code>.csproj</code> {t('reference is rejected before any type from it is used', 'ilegal se rechaza antes de usar ningún tipo suyo')}</td></tr>
          <tr><td>{t('Architecture tests', 'Tests de arquitectura')}</td><td><code>import-linter</code>, NetArchTest, {t('dependency rules', 'reglas de dependencias')}</td><td>{t('Architecture violations fail the build, not just the review', 'Las violaciones de arquitectura rompen la build, no solo la revisión')}</td></tr>
        </tbody>
      </table>
    </>,
  },
  {
    id: 'build-console', act: 3, title: ['A dependency edge, rejected at project load', 'Una dependencia, rechazada al cargar el proyecto'], steps: 0, layout: 'full', form: () => 'dim',
    content: t => <>
      <h2>{t('A dependency edge, rejected at project load', 'Una dependencia, rechazada al cargar el proyecto')}</h2>
      <Term label="Directory.Build.props" lines={[
        '<!-- Directory.Build.props — runs before references resolve -->',
        '<Target Name="ArchVerifyModuleReferences"',
        '        BeforeTargets="ResolveProjectReferences">',
        '  <[[Error]] Condition="\'@(_ArchIllegalRef)\' != \'\' and \'$(ArchSkipReferenceGuard)\' != \'true\'"',
        '         Text="Module \'$(MSBuildProjectName)\' must not reference \'@(_ArchIllegalRef)\'" />',
        '</Target>',
      ]} />
      <p className="lead">{t('The project reference itself is rejected.', 'Se rechaza la propia referencia al proyecto.')}<br /><span className="muted">{t('The illegal dependency never reaches application code.', 'La dependencia ilegal nunca llega al código de la aplicación.')}</span></p>
    </>,
  },
  {
    id: 'commit-ci', act: 3, title: ['2 · Commit & 3 · CI', '2 · Commit y 3 · CI'], steps: 2, layout: 'full', form: () => 'dim',
    content: t => <>
      <h2>{t('2 · Commit & 3 · CI: the change won’t exist, won’t land', '2 · Commit y 3 · CI: el cambio no existirá, no entrará')}</h2>
      <div className="pair">
        <At at={1}>
          <table className="rules hard list">
            <thead><tr><th>{t('Commit hooks', 'Hooks de commit')}</th></tr></thead>
            <tbody>{[t('Formatting', 'Formato'), t('Linting', 'Lint'), t('Commit messages', 'Mensajes de commit'), t('Secret detection', 'Detección de secretos')].map(r => <tr key={r}><td>{r}</td></tr>)}</tbody>
          </table>
        </At>
        <At at={2}>
          <table className="rules hard list">
            <thead><tr><th>{t('CI / repository gates', 'CI / puertas del repositorio')}</th></tr></thead>
            <tbody>{[t('Tests', 'Tests'), t('Architecture validation', 'Validación de arquitectura'), t('Security scanning', 'Análisis de seguridad'), t('Policy checks', 'Comprobación de políticas'), t('Required status checks', 'Checks de estado obligatorios'), t('Branch protection', 'Protección de rama')].map(r => <tr key={r}><td>{r}</td></tr>)}</tbody>
          </table>
        </At>
      </div>
    </>,
  },
  {
    id: 'adoption-console', act: 3, title: ['A <button> the design system never saw', 'Un <button> que el design system nunca vio'], steps: 0, layout: 'full', form: () => 'dim',
    content: t => <>
      <h2>{t('A ', 'Un ')}<code>&lt;button&gt;</code>{t(' the design system never saw', ' que el design system nunca vio')}</h2>
      <Term label="scripts/check-adoption.mjs" lines={[
        '// scripts/check-adoption.mjs — pnpm check:adoption',
        '// per-app contracts: form app → ui-*, admin app → ds-*',
        "const RAW_NATIVE = ['button', 'select', 'input[type=date]'];",
        '',
        'for (const node of templateNodes) {',
        "  if (RAW_NATIVE.includes(node.tag) && !node.line.includes('adoption-allow')) {",
        '    violations.push(`${node.file}:${node.line}  <${node.tag}> instead of ${app.prefix}-*`);',
        '  }',
        '}',
        '',
        'if (violations.length) [[process.exit(1)]]; // wired into build.frontend.yml',
      ]} />
      <p className="lead">{t('Raw HTML is forbidden where the application contract requires a design-system component.', 'El HTML nativo está prohibido donde el contrato de la aplicación exige un componente del design system.')}<br /><span className="muted">{t('CI rejects the change unless an explicit exception is declared.', 'CI rechaza el cambio salvo que se declare una excepción explícita.')}</span></p>
    </>,
  },
  {
    id: 'agent', act: 3, title: ['4 · Agent harness: the agent is refused', '4 · Harness del agente: el agente es rechazado'], steps: 4, layout: 'left', form: () => 'barrier',
    content: t => <>
      <h2>{t('4 · Agent harness: the agent is refused', '4 · Harness del agente: el agente es rechazado')}</h2>
      <List kind="hard" items={[
        [t('Freshness', 'Frescura'), t('A verification result only applies to the exact tree that was verified.', 'Un resultado de verificación solo vale para el árbol exacto que se verificó.'), 'verify-freshness'],
        [t('Verdict integrity', 'Integridad del veredicto'), t('The agent cannot transform a failing command into an apparently successful one.', 'El agente no puede convertir un comando que falla en uno que parece correcto.'), 'no-piped-verdicts'],
        [t('WIP limit', 'Límite de WIP'), t('The agent cannot start more work when the agreed limit is reached.', 'El agente no puede empezar más trabajo cuando se alcanza el límite acordado.'), 'wip-cap'],
        [t('Integration gate', 'Puerta de integración'), t('The agent cannot integrate work that has not reached the required state.', 'El agente no puede integrar trabajo que no ha llegado al estado requerido.'), 'sync-refusal'],
      ]} />
    </>,
  },
  {
    id: 'agent-console', act: 3, title: ['A failing test that looks green', 'Un test rojo que parece verde'], steps: 0, layout: 'full', form: () => 'dim',
    content: t => <>
      <h2>{t('A failing test that looks green', 'Un test rojo que parece verde')}</h2>
      <Term label="no-piped-verdicts" lines={[
        '$ dotnet test | tail -5',
        '[[✘ blocked by hooks/no-piped-verdicts.mjs — command not executed]]',
        '',
        '  `dotnet test` output is piped into `tail`.',
        "  In a pipeline, the exit code is the LAST command's —",
        "  tail's, not the runner's. A red test reports green.",
        '',
        '  Compliant shapes:',
        '    set -o pipefail           # pipeline returns the first failure',
        '    dotnet test > result.log  # the verdict comes from the runner itself',
      ]} />
      <p className="lead">{t('The agent is not allowed to run verification in a way that can hide the original exit code.', 'El agente no puede ejecutar la verificación de forma que oculte el exit code original.')}</p>
    </>,
  },
  {
    id: 'philosophy', act: 3, title: ['The philosophy behind stage 4', 'La filosofía de la etapa 4'], steps: 3, layout: 'left', form: () => 'barrier',
    content: t => <>
      <h2>{t('The philosophy behind stage 4', 'La filosofía de la etapa 4')}</h2>
      <At at={1}><blockquote>{t('“A rule an agent cannot fail is not a guard.”', '«Una regla que un agente no puede incumplir no es una guarda.»')}</blockquote></At>
      <At at={2}><blockquote>{t('“Agent cooperation is not evidence.”', '«Que el agente coopere no es una evidencia.»')}</blockquote></At>
      <At at={3}><p className="lead">{t('Enforce boundaries and evidence.', 'Impón los límites y las evidencias.')}<br /><span className="muted">{t('Treat preferences as guidance.', 'Trata las preferencias como guía.')}</span></p></At>
    </>,
  },
  {
    id: 'takeaway', act: 4, title: ['Some soft guardrails deserve to become hard', 'Algunos guardarraíles blandos merecen ser duros'], steps: 1, layout: 'center', form: step => (['barrier', 'steel'] as const)[step],
    content: t => <div className="statement">
      <h2 className="mid">{t('Some', 'Algunos')} <span className="w-soft">{t('soft', 'guardarraíles blandos')}</span> {t('guardrails deserve to become', 'merecen ser')} <span className="w-hard">{t('hard', 'duros')}</span></h2>
      <p className="lead">{t('When a rule matters enough, make it executable.', 'Cuando una regla importa lo suficiente, hazla ejecutable.')}</p>
      <At at={1}><p className="lead muted">{t('And when agents execute the work, guard the verdicts as well as the code.', 'Y cuando son los agentes quienes ejecutan el trabajo, protege los veredictos además del código.')}</p></At>
    </div>,
  },
  {
    id: 'contact', act: 0, title: ['Write to me', 'Escríbeme'], steps: 0, layout: 'center', form: () => 'parked',
    content: t => <div className="closing">
      <p className="eyebrow">{t('Questions, war stories, your next soft → hard candidate', 'Dudas, batallitas, tu próximo candidato blando → duro')}</p>
      <QrCode value={`mailto:${EMAIL}`} />
      <a className="email" href={`mailto:${EMAIL}`}>{EMAIL}</a>
      <p className="links">Juan G. Carmona · Plain Concepts</p>
    </div>,
  },
]

const EMAIL = 'juan.garciacarmona@plainconcepts.com'
