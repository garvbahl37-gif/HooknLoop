#!/usr/bin/env node
/**
 * Klaviyo flow tool.
 *
 *   node flow-tool.mjs list
 *   node flow-tool.mjs dump <flowId>          → writes definitions/<name>.json
 *   node flow-tool.mjs create <file.json>     → creates a flow from a definition
 *
 * Auth: set KLAVIYO_PRIVATE_KEY in the environment. Never paste it into a
 * chat, a commit, or a command you'd rather not have in your shell history:
 *
 *   export KLAVIYO_PRIVATE_KEY=pk_xxxxxxxx
 *
 * The flows API is BETA. Klaviyo pin it behind a pre-release revision header
 * and say it may change. Practical consequence: created flows are real and
 * appear in your account, so everything here creates them in DRAFT and never
 * activates anything. Review in the UI before you turn one on.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = 'https://a.klaviyo.com/api'

// Beta revision required by the flow-definition endpoints. Bump only when
// Klaviyo publish a newer one — an unknown revision is rejected outright.
const REVISION = '2024-10-15.pre'

const KEY = process.env.KLAVIYO_PRIVATE_KEY
if (!KEY) {
  console.error('KLAVIYO_PRIVATE_KEY is not set.\n\n  export KLAVIYO_PRIVATE_KEY=pk_...\n')
  process.exit(1)
}
if (!KEY.startsWith('pk_')) {
  console.error('That does not look like a private key. Private keys start with "pk_".')
  process.exit(1)
}

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Klaviyo-API-Key ${KEY}`,
      revision: REVISION,
      accept: 'application/vnd.api+json',
      ...(body ? { 'content-type': 'application/vnd.api+json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`${res.status} — response was not JSON:\n${text.slice(0, 500)}`)
  }

  if (!res.ok) {
    const detail =
      json?.errors?.map((e) => `  • ${e.title}: ${e.detail ?? ''}`).join('\n') ?? text.slice(0, 500)
    throw new Error(`${res.status} ${res.statusText}\n${detail}`)
  }
  return json
}

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'flow'

async function list() {
  const { data } = await api('/flows/')
  if (!data?.length) {
    console.log('No flows found on this account yet.')
    return
  }
  console.log(`${data.length} flow(s):\n`)
  for (const f of data) {
    const a = f.attributes ?? {}
    console.log(`  ${f.id}  ${String(a.status ?? '?').padEnd(8)}  ${a.name ?? '(unnamed)'}`)
  }
  console.log('\nNext:  node flow-tool.mjs dump <flowId>')
}

async function dump(flowId) {
  if (!flowId) throw new Error('Usage: flow-tool.mjs dump <flowId>')

  const { data } = await api(`/flows/${flowId}?additional-fields[flow]=definition`)
  const name = data?.attributes?.name ?? flowId
  const outDir = join(ROOT, 'definitions')
  await mkdir(outDir, { recursive: true })

  const file = join(outDir, `${slug(name)}.json`)
  await writeFile(file, JSON.stringify(data, null, 2))

  const actions = data?.attributes?.definition?.actions ?? []
  console.log(`Wrote ${file}`)
  console.log(`  name    : ${name}`)
  console.log(`  status  : ${data?.attributes?.status}`)
  console.log(`  triggers: ${JSON.stringify(data?.attributes?.definition?.triggers ?? [])}`)
  console.log(`  actions : ${actions.length}`)
  for (const a of actions) console.log(`     - ${a.type}${a.id ? ` (${a.id})` : ''}`)
}

/**
 * Creating a flow from a dumped definition.
 *
 * Klaviyo identify new actions by `temporary_id` rather than `id`; a definition
 * pulled from an existing flow carries real ids, which are rejected on create.
 * This rewrites them and repoints every reference, which is the step the docs
 * describe and the one that is easy to get wrong by hand.
 */
function prepareDefinition(definition) {
  const clone = structuredClone(definition)
  const remap = new Map()

  for (const action of clone.actions ?? []) {
    if (action.id) {
      remap.set(action.id, action.id)
      action.temporary_id = action.id
      delete action.id
    }
  }

  // Repoint any id references elsewhere in the tree to their temporary_id.
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (typeof v === 'string' && remap.has(v) && k !== 'temporary_id') node[k] = remap.get(v)
        else walk(v)
      }
    }
  }
  walk(clone)

  return clone
}

async function create(file) {
  if (!file) throw new Error('Usage: flow-tool.mjs create <file.json>')

  const raw = JSON.parse(await readFile(file, 'utf8'))
  // Accept either a dumped flow object or a bare { name, definition }.
  const name = raw?.attributes?.name ?? raw?.name
  const definition = raw?.attributes?.definition ?? raw?.definition
  if (!definition) throw new Error(`No "definition" found in ${file}`)

  const body = {
    data: {
      type: 'flow',
      attributes: {
        name: name ? `${name} (copy)` : 'Untitled flow',
        definition: prepareDefinition(definition),
      },
    },
  }

  const { data } = await api('/flows/', { method: 'POST', body })
  console.log(`Created flow ${data.id} — "${data.attributes?.name}"`)
  console.log(`Status: ${data.attributes?.status}`)
  console.log('\nIt is a DRAFT. Open it in Klaviyo, check every step, then turn it on.')
}

const [cmd, arg] = process.argv.slice(2)

try {
  if (cmd === 'list') await list()
  else if (cmd === 'dump') await dump(arg)
  else if (cmd === 'create') await create(arg)
  else {
    console.log(`Klaviyo flow tool

  node flow-tool.mjs list                 list flows and their ids
  node flow-tool.mjs dump <flowId>        save a flow's definition to definitions/
  node flow-tool.mjs create <file.json>   create a draft flow from a definition

Set KLAVIYO_PRIVATE_KEY first.`)
  }
} catch (err) {
  console.error(`\n${err.message}\n`)
  process.exit(1)
}
