import type { ReactNode } from 'react'
import { At, Code, Plate } from './components'
import { QrCode } from './QrCode'
import type { T } from './i18n'
import type { Cue, FormName } from './road/forms'

// The scene list mirrors content/outline.md. It started from the first Soft & Hard
// Guardrails deck in juangcarmona/presentations (commit 56b7388, the DevEx Chapter
// Roundtable) and was rewritten for clarity: determinism, worked examples, real code.

export type Scene = {
  id: string
  act: 0 | 1 | 2 | 3 | 4
  title: [en: string, es: string]
  steps: number
  layout: 'left' | 'center' | 'full' | 'cover'
  form: (step: number) => FormName
  /** The lorries this sheet sends down the road, timed from when it opens. None if absent. */
  traffic?: Cue[]
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

/** Ten attempts at the same rule-breaking change: `miss` marks where it got through. */
function Runs({ kind, misses = [] }: { kind: 'soft' | 'hard'; misses?: number[] }) {
  return <div className="runs">{Array.from({ length: 10 }, (_, k) => kind === 'hard'
    ? <i key={k} className="stop">✕</i>
    : misses.includes(k) ? <i key={k} className="miss">!</i> : <i key={k} className="ok">✓</i>)}</div>
}

const es = (t: T) => t('en', 'es') === 'es'

export const scenes: Scene[] = [
  {
    id: 'title', act: 0, title: ['Soft & Hard Guardrails', 'Guardarraíles blandos y duros'], steps: 0, layout: 'cover', form: () => 'start',
    traffic: [{ at: 24, outcome: 'hold' }, { at: 60, outcome: 'crash' }],
    content: t => <>
      <div className="title">
        <p className="eyebrow">{t('Guardrails for coding agents', 'Guardarraíles para agentes de código')}</p>
        {es(t)
          ? <h1>Guardarraíles<br /><span className="w-soft">blandos</span> <span className="amp">y</span> <span className="w-hard">duros</span></h1>
          : <h1><span className="w-soft">Soft</span> <span className="amp">&amp;</span> <span className="w-hard">Hard</span><br />Guardrails</h1>}
        <p className="subtitle">{t('Guidance that steers. Enforcement that refuses.', 'Unos te avisan. Otros no te dejan pasar.')}</p>
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
    id: 'definition', act: 1, title: ['What is a guardrail?', '¿Qué es un guardarraíl?'], steps: 0, layout: 'center', form: () => 'gravel',
    traffic: [{ at: 4, outcome: 'crash' }],
    content: t => <div className="statement">
      <p className="eyebrow">{t('What is a guardrail?', '¿Qué es un guardarraíl?')}</p>
      <h2 className="mid">{t('Anything that keeps a change from leaving the road', 'Todo lo que evita que un cambio se salga de la carretera')}</h2>
      <p className="lead muted">{t('Some point the way. Others close it when you get it wrong.', 'Unos te indican el camino. Otros te lo cierran si te equivocas.')}</p>
    </div>,
  },
  {
    id: 'two-kinds', act: 1, title: ['Two kinds of guardrails', 'Dos tipos de guardarraíles'], steps: 2, layout: 'left', form: step => (['gravel', 'paint', 'barrier'] as const)[step],
    content: t => <>
      <h2 className="one-line">{t('Two kinds of guardrails', 'Dos tipos de guardarraíles')}</h2>
      <div className="stack">
        <At at={1} className="kind-card soft">
          <Plate kind="soft">{t('Soft', 'Blando')}</Plate><b>{t('Shows you the way', 'Te dice por dónde ir')}</b>
          <span>{es(t)
            ? <>La regla está escrita, pero <strong>nada te impide saltártela</strong>. Alguien tiene que <strong>decidir cumplirla</strong>.</>
            : <>The rule is written down, but <strong>nothing stops you ignoring it</strong>. Someone has to <strong>choose to follow it</strong>.</>}</span>
          <Chips kind="soft" items={['Warnings', t('Docs', 'Documentación'), 'ADRs', 'AGENTS.md', t('Checklists', 'Checklists')]} />
        </At>
        <At at={2} className="kind-card hard">
          <Plate kind="hard">{t('Hard', 'Duro')}</Plate><b>{t('Won’t let you through', 'No te deja pasar')}</b>
          <span>{es(t)
            ? <>Si rompes la regla, <strong>la herramienta se para</strong>. No hace falta que <strong>nadie se dé cuenta</strong> ni que nadie esté de acuerdo.</>
            : <>Break the rule and <strong>the tool stops</strong>. <strong>Nobody has to notice</strong>, and nobody has to agree.</>}</span>
          <Chips kind="hard" items={[t('Compiler', 'Compilador'), t('Analyzers', 'Analizadores'), 'Hooks', t('CI checks', 'Checks de CI'), t('Harness policies', 'Políticas del harness')]} />
        </At>
      </div>
    </>,
  },
  {
    id: 'determinism', act: 1, title: ['Deterministic or not', 'Determinista o no'], steps: 2, layout: 'left', form: step => (['paint', 'paint', 'barrier'] as const)[step],
    content: t => <>
      <h2 className="one-line">{t('Same change, ten times', 'El mismo cambio, diez veces')}</h2>
      <div className="stack">
        <At at={1} className="runs-card soft">
          <header><Plate kind="soft">{t('Non-deterministic', 'Indeterminista')}</Plate><b>{t('An instruction the agent reads', 'Una instrucción que el agente lee')}</b></header>
          <p>{es(t)
            ? <>«Nunca accedas a la base de datos desde un controlador», en <code>AGENTS.md</code>. Pongamos que el agente lo respeta <strong>nueve de cada diez veces</strong>.</>
            : <>“Never touch the database from a controller”, in <code>AGENTS.md</code>. Say the agent respects it <strong>nine times out of ten</strong>.</>}</p>
          <Runs kind="soft" misses={[6]} />
          <p className="score">{es(t) ? <>9 de 10. <em>La décima llega a producción</em></> : <>9 of 10. <em>The tenth one reaches production</em></>}</p>
        </At>
        <At at={2} className="runs-card hard">
          <header><Plate kind="hard">{t('Deterministic', 'Determinista')}</Plate><b>{t('A test the build runs', 'Un test que ejecuta la build')}</b></header>
          <p>{es(t)
            ? <>Un test de arquitectura prohíbe esa dependencia. <strong>Falla cada vez</strong> que alguien la mete: una persona, un agente o tú un viernes a las siete.</>
            : <>An architecture test forbids that dependency. It <strong>fails every time</strong> someone adds it: a person, an agent, or you at seven on a Friday.</>}</p>
          <Runs kind="hard" />
          <p className="score">{t('10 of 10. Same input, same answer', '10 de 10. Misma entrada, misma respuesta')}</p>
        </At>
      </div>
    </>,
  },
  {
    id: 'soft-examples', act: 2, title: ['Examples of soft guardrails', 'Ejemplos de guardarraíles blandos'], steps: 5, layout: 'left', form: () => 'paint',
    traffic: [{ at: 12, outcome: 'hold' }, { at: 45, outcome: 'crash' }],
    content: t => <>
      <h2 className="one-line">{t('Examples of soft guardrails', 'Ejemplos de guardarraíles blandos')}</h2>
      <List kind="soft" items={[
        [t('Repository instructions', 'Instrucciones del repositorio'), <><code>CONTRIBUTING.md</code> · <code>AGENTS.md</code> · <code>CLAUDE.md</code> · <code>copilot-instructions.md</code>. {t('They tell a person or an agent how work is done here.', 'Le explican a una persona o a un agente cómo se trabaja aquí.')}</>],
        [t('Architecture & product docs', 'Docs de arquitectura y producto'), t('ADRs, RFCs, specs. They say what was decided and why. None of them checks that it still holds.', 'ADR, RFC, specs. Cuentan qué se decidió y por qué. Ninguno comprueba que se siga cumpliendo.')],
        [t('Rules set to warning', 'Reglas en modo warning'), t('They show up in yellow and the build carries on. Once there are two hundred, nobody reads them.', 'Salen en amarillo y la build sigue. Cuando hay doscientos, ya nadie los lee.')],
        [t('Prompts, skills & agent conventions', 'Prompts, skills y convenciones del agente'), t('They work if the agent reads them and still has them in mind when it matters.', 'Funcionan si el agente las lee y las tiene presentes cuando toca.')],
        [t('Review checklists', 'Checklists de revisión'), t('They work if the reviewer goes through them before approving.', 'Funcionan si quien revisa las repasa antes de aprobar.')],
      ]} />
    </>,
  },
  {
    id: 'soft-practice', act: 2, title: ['Who checks the rule?', '¿Quién comprueba la regla?'], steps: 1, layout: 'full', form: () => 'paint',
    content: t => <>
      <h2>{t('Who checks the rule?', '¿Quién comprueba la regla?')}</h2>
      <table className="rules soft wide">
        <thead><tr><th>{t('Where', 'Dónde')}</th><th>{t('Rule', 'Regla')}</th><th>{t('Who checks it', 'Quién lo comprueba')}</th></tr></thead>
        <tbody>
          <tr><td><code>AGENTS.md</code></td><td>{t('“Use the repository; never touch the database directly”', '«Usa el repositorio; nunca toques la base de datos directamente»')}</td><td className="who">{t('Nobody', 'Nadie')}</td></tr>
          <tr><td>ADR</td><td>{t('“Modules talk to each other through contracts”', '«Los módulos se hablan a través de contratos»')}</td><td className="who">{t('The reviewer, if they remember', 'Quien revisa, si se acuerda')}</td></tr>
          <tr><td>{t('Linter', 'Linter')}</td><td>{t('Rule set to', 'Regla configurada como')} <code>warn</code></td><td className="who">{t('Nobody: it is only a warning', 'Nadie: solo es un aviso')}</td></tr>
          <tr><td>{t('Engineering docs', 'Docs de ingeniería')}</td><td>{t('“Every endpoint needs authorization”', '«Todo endpoint necesita autorización»')}</td><td className="who">{t('Nobody, until it breaks', 'Nadie, hasta que falla')}</td></tr>
          <tr><td>{t('PR checklist', 'Checklist de PR')}</td><td>{t('“Add tests for what you change”', '«Añade tests para lo que cambies»')}</td><td className="who">{t('The reviewer, if there’s time', 'Quien revisa, si tiene tiempo')}</td></tr>
        </tbody>
      </table>
      <At at={1}><p className="punch">{t('All of it perfectly documented.', 'Todo perfectamente documentado.')} <span className="w-hard">{t('None of it guaranteed.', 'Nada garantizado.')}</span></p></At>
    </>,
  },
  {
    id: 'soft-code', act: 2, title: ['The rule was written down', 'La regla estaba escrita'], steps: 2, layout: 'left', form: () => 'paint',
    traffic: [{ at: 14, outcome: 'crash' }],
    content: t => <>
      <h2 className="one-line">{t('The rule was written down', 'La regla estaba escrita')}</h2>
      <div className="stack-code">
        <Code lang="markdown" file="AGENTS.md" lines={es(t)
          ? ['# Módulo Orders', '## Reglas', '- Los controladores nunca tocan el `DbContext`.', '- Todo acceso a datos pasa por `IOrderRepository`.']
          : ['# Orders module', '## Rules', '- Controllers never touch the `DbContext`.', '- All data access goes through `IOrderRepository`.']} mark={[3]} className="small" />
        <At at={1}>
          <Code lang="csharp" file="OrdersController.cs" className="small" mark={[5, 6, 7]} lines={[
            '[HttpGet("{id}")]',
            'public async Task<IActionResult> Get(Guid id)',
            '{',
            t('    // the repository has no overload that loads the lines', '    // el repositorio no tiene un método que cargue las líneas'),
            '    var order = await _db.Orders',
            '        .Include(o => o.Lines)',
            '        .FirstOrDefaultAsync(o => o.Id == id);',
            '    return order is null ? NotFound() : Ok(order);',
            '}',
          ]} />
        </At>
      </div>
      <At at={2}>
        <div className="pipeline"><i>build ✔</i><i>tests ✔</i><i>review ✔</i><i>merge ✔</i><span>{t('Everything green.', 'Todo en verde.')}</span></div>
        <p className="punch verdict panel">{t('The rule lived in a file that nothing runs.', 'La regla vivía en un fichero que nada ejecuta.')}</p>
      </At>
    </>,
  },
  {
    id: 'refuses', act: 3, title: ['When the tool says no', 'Cuando la herramienta dice que no'], steps: 1, layout: 'center', form: () => 'barrier',
    traffic: [{ at: 4, outcome: 'scrape' }],
    content: t => <div className="statement">
      <p className="eyebrow"><Plate kind="soft">{t('Soft', 'Blando')}</Plate> → <Plate kind="hard">{t('Hard', 'Duro')}</Plate></p>
      <h2>{t('When the tool says no', 'Cuando la herramienta dice que no')}</h2>
      <p className="lead">{t('The rule becomes part of the process: if it isn’t met, the process stops.', 'La regla pasa a formar parte del proceso: si no se cumple, el proceso se para.')}</p>
      <At at={1}><p className="lead muted">{t('It doesn’t depend on someone remembering, or on the model paying attention.', 'No depende de que alguien se acuerde ni de que el modelo esté atento.')}<br />{t('It answers the same way every time.', 'Responde igual cada vez.')}</p></At>
    </div>,
  },
  {
    id: 'surfaces', act: 3, title: ['Four places to say no', 'Cuatro sitios donde decir que no'], steps: 5, layout: 'full', form: step => (['stones', 'stones', 'logs', 'barrier', 'stop', 'stop'] as const)[step],
    traffic: [{ at: 10, outcome: 'hold' }, { at: 32, outcome: 'scrape' }],
    content: t => <>
      <h2>{t('Four places to say no', 'Cuatro sitios donde decir que no')}</h2>
      <ol className="surfaces compact">
        {([
          ['1 · Commit', t('The commit is never created', 'El commit no llega a crearse'), t('Husky pre-commit, commitlint, secret scanning. The easiest place to start.', 'Husky pre-commit, commitlint, detección de secretos. Lo más fácil para empezar.')],
          ['2 · CI / Merge', t('The change doesn’t get in', 'El cambio no entra'), t('Required checks, adoption gates, drift validation, coverage floors. We’ve had these for years.', 'Checks obligatorios, puertas de adopción, validación de drift, cobertura mínima. Lo tenemos de toda la vida.')],
          ['3 · Build', t('It doesn’t compile', 'No compila'), t('Analyzers as errors, MSBuild reference guards, strict types, architecture tests. Where most builds can do much more.', 'Analizadores como error, guardas de referencias en MSBuild, tipos estrictos, tests de arquitectura. Aquí nuestras builds pueden dar mucho más.')],
          [t('4 · Agent harness', '4 · Harness del agente'), t('It stops the agent', 'Le para los pies al agente'), t('Push gates, verdict checks, WIP limits, refusals in slash commands', 'Bloqueo de push, comprobación de veredictos, límite de trabajo en curso, rechazos en slash commands')],
        ] as const).map(([pk, head, body], k) => <At key={k} at={k + 1} as="div" className={`surface ${k === 3 ? 'agent' : ''}`}><small>{pk}</small><b>{head}</b><span>{body}</span></At>)}
      </ol>
      <At at={5} className="callout bottom">
        {es(t)
          ? <p>Las etapas 1 a 3 paran el <b>código</b>. La 4 le para los pies al <b className="w-hard">agente</b>.<br /><span className="muted">El harness puede pararlo todo, así que los workflows y los procesos también tienen que ser duros.</span></p>
          : <p>Stages 1 to 3 stop bad <b>code</b>. Stage 4 stops the <b className="w-hard">agent</b>.<br /><span className="muted">Our harness can halt everything, so workflows and processes have to be hard too.</span></p>}
      </At>
    </>,
  },
  {
    id: 'commit-ci', act: 3, title: ['1 · Commit & 2 · CI', '1 · Commit y 2 · CI'], steps: 2, layout: 'full', form: step => step >= 2 ? 'dimLogs' : 'dimStones',
    content: t => <>
      <h2>{t('1 · Commit & 2 · CI: the change never exists, or never gets in', '1 · Commit y 2 · CI: el cambio no llega a existir, o no entra')}</h2>
      <div className="pair">
        <At at={1}>
          <table className="rules hard list">
            <thead><tr><th>{t('Commit hooks · before it exists', 'Hooks de commit · antes de que exista')}</th></tr></thead>
            <tbody>
              <tr><td>{t('Formatting', 'Formato')} · <code>csharpier</code>, <code>lint-staged</code></td></tr>
              <tr><td>{t('Linting with zero tolerance', 'Lint sin tolerancia')} · <code>eslint --max-warnings=0</code></td></tr>
              <tr><td>{t('Commit messages', 'Mensajes de commit')} · <code>commitlint</code></td></tr>
              <tr><td>{t('Secret detection', 'Detección de secretos')}</td></tr>
            </tbody>
          </table>
        </At>
        <At at={2}>
          <table className="rules hard list">
            <thead><tr><th>{t('CI and repository · before it gets in', 'CI y repositorio · antes de que entre')}</th></tr></thead>
            <tbody>
              <tr><td>{t('Tests', 'Tests')}</td></tr>
              <tr><td>{t('Architecture validation', 'Validación de arquitectura')}</td></tr>
              <tr><td>{t('Spec conformance', 'Conformidad con la spec')} · <code>openspec validate</code></td></tr>
              <tr><td>{t('Security scanning', 'Análisis de seguridad')}</td></tr>
              <tr><td>{t('Required status checks and branch protection', 'Checks obligatorios y protección de rama')}</td></tr>
            </tbody>
          </table>
        </At>
      </div>
    </>,
  },
  {
    id: 'adoption-console', act: 3, title: ['A <button> the design system never saw', 'Un <button> que el design system nunca vio'], steps: 0, layout: 'full', form: () => 'dimLogs',
    content: t => <>
      <h2>{t('A ', 'Un ')}<code>&lt;button&gt;</code>{t(' the design system never saw', ' que el design system nunca vio')}</h2>
      <Code lang="javascript" file="scripts/check-adoption.mjs" mark={[6, 11]} lines={[
        t('// pnpm check:adoption · each app has its own contract: form → ui-*, admin → ds-*', '// pnpm check:adoption · cada app tiene su contrato: form → ui-*, admin → ds-*'),
        "const RAW_NATIVE = ['button', 'select', 'input[type=date]'];",
        '',
        'for (const node of templateNodes) {',
        "  const allowed = node.line.includes('adoption-allow');",
        '  if (RAW_NATIVE.includes(node.tag) && !allowed) {',
        '    violations.push(`${node.file}:${node.line}  <${node.tag}> instead of ${app.prefix}-*`);',
        '  }',
        '}',
        '',
        t('if (violations.length) process.exit(1); // wired into build.frontend.yml', 'if (violations.length) process.exit(1); // conectado a build.frontend.yml'),
      ]} />
      <p className="lead">{t('In this app a bare <button> is forbidden: you use the design-system one.', 'En esta app, un <button> a pelo está prohibido: se usa el del design system.')}<br /><span className="muted">{t('CI rejects the change unless you mark the exception on purpose.', 'CI rechaza el cambio salvo que marques la excepción a propósito.')}</span></p>
    </>,
  },
  {
    id: 'build', act: 3, title: ['3 · Build: it doesn’t compile', '3 · Build: no compila'], steps: 0, layout: 'full', form: () => 'dim',
    content: t => <>
      <h2>{t('3 · Build: it doesn’t compile', '3 · Build: no compila')}</h2>
      <table className="rules hard">
        <thead><tr><th>{t('Where', 'Dónde')}</th><th>{t('Rule', 'Regla')}</th><th>{t('What happens', 'Qué pasa')}</th></tr></thead>
        <tbody>
          <tr><td>{t('Warnings as errors', 'Warnings como errores')}</td><td><code>&lt;TreatWarningsAsErrors&gt;true&lt;/TreatWarningsAsErrors&gt;</code></td><td>{t('The soft warning from before now stops the build', 'El warning blando de antes ahora para la build')}</td></tr>
          <tr><td>{t('Compiler / type checker', 'Compilador / type checker')}</td><td><code>"strict": true</code>, <code>mypy --strict</code></td><td>{t('A type error breaks the build instead of underlining a line in the editor', 'Un error de tipos rompe la build, no se queda en un subrayado del editor')}</td></tr>
          <tr><td>{t('Roslyn analyzers', 'Analizadores de Roslyn')}</td><td><code>dotnet_diagnostic.MOD002.severity = error</code></td><td>{t('The build fails the moment code crosses a module boundary', 'La build falla en cuanto el código cruza la frontera de un módulo')}</td></tr>
          <tr><td>{t('MSBuild reference guard', 'Guarda de referencias en MSBuild')}</td><td><code>ArchVerifyModuleReferences</code></td><td>{t('A forbidden', 'Una referencia prohibida en el')} <code>.csproj</code> {t('reference is rejected before any of its types is used', 'se rechaza antes de usar ninguno de sus tipos')}</td></tr>
          <tr><td>{t('Architecture tests', 'Tests de arquitectura')}</td><td>NetArchTest, <code>import-linter</code></td><td>{t('Breaking the architecture fails the build; it doesn’t wait for review', 'Romper la arquitectura rompe la build; no espera a la revisión')}</td></tr>
        </tbody>
      </table>
    </>,
  },
  {
    id: 'build-console', act: 3, title: ['A reference rejected before it compiles', 'Una referencia rechazada antes de compilar'], steps: 1, layout: 'full', form: () => 'dim',
    content: t => <>
      <h2>{t('A reference rejected before it compiles', 'Una referencia rechazada antes de compilar')}</h2>
      <Code lang="xml" file="Directory.Build.props" mark={[4]} lines={[
        t('<!-- Runs before project references are resolved -->', '<!-- Se ejecuta antes de resolver las referencias entre proyectos -->'),
        '<Target Name="ArchVerifyModuleReferences"',
        '        BeforeTargets="ResolveProjectReferences">',
        '  <Error Condition="\'@(_ArchIllegalRef)\' != \'\' and \'$(ArchSkipReferenceGuard)\' != \'true\'"',
        '         Text="Module \'$(MSBuildProjectName)\' must not reference \'@(_ArchIllegalRef)\'" />',
        '</Target>',
      ]} />
      <At at={1}>
        <Code lang="console" file="terminal" className="small" lines={[
          '$ dotnet build',
          'Orders.csproj : error : Module \'Orders\' must not reference \'Billing.Infrastructure\'',
          'Build FAILED.',
        ]} />
      </At>
      <p className="lead muted">{t('The forbidden dependency never reaches a single line of application code.', 'La dependencia prohibida no llega a ninguna línea de código de la aplicación.')}</p>
    </>,
  },
  {
    id: 'agent', act: 3, title: ['4 · Agent harness: the agent is stopped', '4 · Harness del agente: le para los pies'], steps: 4, layout: 'left', form: () => 'stop',
    content: t => <>
      <h2>{t('4 · Agent harness: the agent is stopped', '4 · Harness del agente: le para los pies')}</h2>
      <List kind="hard" items={[
        [t('Freshness', 'Frescura'), t('A verification result only counts for the exact tree that was verified. Change something and it runs again.', 'Un resultado de verificación solo vale para el árbol exacto que se verificó. Si cambias algo, se vuelve a verificar.'), 'verify-freshness'],
        [t('Honest verdicts', 'Veredictos honestos'), t('The agent cannot turn a failing command into one that looks like it passed.', 'El agente no puede convertir un comando que falla en uno que parece que pasa.'), 'no-piped-verdicts'],
        [t('Work-in-progress limit', 'Límite de trabajo en curso'), t('Once the agreed limit is reached, the agent cannot start anything new.', 'Si se ha llegado al límite acordado, el agente no puede empezar nada nuevo.'), 'wip-cap'],
        [t('Integration gate', 'Puerta de integración'), t('The agent cannot integrate work that hasn’t reached the required state.', 'El agente no puede integrar trabajo que no ha llegado al estado que se exige.'), 'sync-refusal'],
      ]} />
    </>,
  },
  {
    id: 'agent-hook', act: 3, title: ['A hook that says no', 'Un hook que dice que no'], steps: 2, layout: 'full', form: () => 'dim',
    content: t => <>
      <h2>{t('A hook that says no', 'Un hook que dice que no')}</h2>
      <div className="code-pair even">
        <Code lang="json" file=".claude/settings.json" className="small" mark={[3, 4]} lines={[
          '{',
          '  "hooks": {',
          '    "PreToolUse": [{',
          '      "matcher": "Bash",',
          '      "hooks": [{',
          '        "type": "command",',
          '        "command": "node .claude/hooks/no-piped-verdicts.mjs"',
          '      }]',
          '    }]',
          '  }',
          '}',
        ]} />
        <Code lang="javascript" file=".claude/hooks/no-piped-verdicts.mjs" className="small" mark={[10]} lines={[
          "import { readFileSync } from 'node:fs';",
          '',
          'const { tool_input } = JSON.parse(readFileSync(0, \'utf8\'));',
          'const runsTests = /\\b(dotnet test|pnpm test|pytest)\\b/.test(tool_input.command);',
          'const hidesExit = /\\|\\s*(tail|head|grep)\\b/.test(tool_input.command)',
          "  && !tool_input.command.includes('pipefail');",
          '',
          'if (runsTests && hidesExit) {',
          t("  console.error('A pipe hides the test exit code. Use set -o pipefail.');", "  console.error('La tubería esconde el exit code. Usa set -o pipefail.');"),
          t('  process.exit(2); // 2 = block: the command never runs', '  process.exit(2); // 2 = bloquear: el comando no se ejecuta'),
          '}',
        ]} />
      </div>
      <At at={1}><p className="lead">{es(t)
        ? <>Corre antes de cada comando del agente. <strong>Código 2: el comando no se ejecuta</strong> y el agente lee el motivo.</>
        : <>It runs before every agent command. <strong>Exit 2: the command never runs</strong> and the agent reads why.</>}</p></At>
      <At at={2}>
        <blockquote className="quote">{es(t)
          ? <>«Los hooks te dan control determinista: ciertas acciones ocurren siempre, en vez de depender de que el modelo decida hacerlas.»<cite>Documentación de Claude Code · GitHub Copilot y otros harness también tienen hooks</cite></>
          : <>“Hooks give you deterministic control: certain actions always happen rather than relying on the LLM to choose to run them.”<cite>Claude Code docs · GitHub Copilot and other harnesses have hooks too</cite></>}</blockquote>
      </At>
    </>,
  },
  {
    id: 'agent-console', act: 3, title: ['A red test that looks green', 'Un test en rojo que parece verde'], steps: 0, layout: 'full', form: () => 'dim',
    content: t => <>
      <h2>{t('A red test that looks green', 'Un test en rojo que parece verde')}</h2>
      <Code lang="console" file="terminal" mark={[2]} lines={[
        '$ dotnet test | tail -5',
        '✘ blocked by hooks/no-piped-verdicts.mjs · command not executed',
        '',
        t('# `dotnet test` is piped into `tail`.', '# La salida de `dotnet test` va por una tubería a `tail`.'),
        t('# A pipeline returns the exit code of its LAST command:', '# Una tubería devuelve el código de salida de su ÚLTIMO comando:'),
        t('# tail’s, not the test runner’s. A red test reports green.', '# el de tail, no el del test. Un test en rojo sale en verde.'),
        '',
        t('# What is allowed:', '# Lo que sí se permite:'),
        '$ set -o pipefail && dotnet test | tail -5',
        '$ dotnet test > result.log',
        t('✔ the verdict comes from the test runner itself', '✔ el veredicto lo da el propio test'),
      ]} />
      <p className="lead">{t('The agent is not allowed to run verification in a way that hides the real exit code.', 'El agente no puede lanzar la verificación de una forma que esconda el código de salida real.')}</p>
    </>,
  },
  {
    id: 'philosophy', act: 3, title: ['The thinking behind stage 4', 'La idea detrás de la etapa 4'], steps: 3, layout: 'left', form: () => 'barrier',
    traffic: [{ at: 10, outcome: 'scrape' }],
    content: t => <>
      <h2>{t('The thinking behind stage 4', 'La idea detrás de la etapa 4')}</h2>
      <At at={1}><blockquote>{t('“A rule an agent cannot fail is not a guard.”', '«Una regla que el agente no puede suspender no protege nada.»')}</blockquote></At>
      <At at={2}><blockquote>{t('“Agent cooperation is not evidence.”', '«Que el agente colabore no demuestra nada.»')}</blockquote></At>
      <At at={3}><p className="lead">{t('Enforce boundaries and evidence.', 'Impón los límites y las pruebas.')}<br /><span className="muted">{t('Leave preferences as guidance.', 'Las preferencias, déjalas como guía.')}</span></p></At>
    </>,
  },
  {
    id: 'takeaway', act: 4, title: ['Some soft guardrails deserve to become hard', 'Algunos guardarraíles blandos merecen ser duros'], steps: 2, layout: 'center', form: step => (['barrier', 'steel', 'steel'] as const)[step],
    traffic: [{ at: 8, outcome: 'hold' }],
    content: t => <div className="statement">
      <h2 className="mid">{t('Some', 'Algunos')} <span className="w-soft">{t('soft', 'guardarraíles blandos')}</span> {t('guardrails deserve to become', 'merecen ser')} <span className="w-hard">{t('hard', 'duros')}</span></h2>
      <p className="lead">{t('When a rule really matters, turn it into something that runs.', 'Cuando una regla importa de verdad, conviértela en algo que se ejecute.')}</p>
      <At at={1}><p className="lead muted">{t('Which one? The one that keeps breaking in the same place. On the road that’s a black spot, and that’s where the steel goes.', '¿Cuál? La que se rompe una y otra vez en el mismo sitio. En carretera eso es un punto negro, y ahí es donde se pone la bionda.')}</p></At>
      <At at={2}><p className="lead muted">{t('And when agents do the work, check what they say they did, not only the code.', 'Y si el trabajo lo hacen agentes, comprueba también lo que dicen que han hecho, no solo el código.')}</p></At>
    </div>,
  },
  {
    id: 'contact', act: 0, title: ['Write to me', 'Escríbeme'], steps: 0, layout: 'left', form: () => 'mirador',
    content: t => <div className="closing">
      <p className="eyebrow">{t('Questions, war stories, your next soft → hard candidate', 'Dudas, batallitas, tu próximo candidato blando → duro')}</p>
      <QrCode value={`mailto:${EMAIL}`} />
      <a className="email" href={`mailto:${EMAIL}`}>{EMAIL}</a>
      <p className="links">Juan G. Carmona · Plain Concepts</p>
    </div>,
  },
]

const EMAIL = 'juan.garciacarmona@plainconcepts.com'
