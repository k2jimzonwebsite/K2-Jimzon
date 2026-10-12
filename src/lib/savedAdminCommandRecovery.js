// Shared persistence only. Domain validators own the admitted command shape.
export function createSavedAdminCommandRecovery({ namespace, label, validatePayloadText }) {
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const unsafe = () => new Error(`The pending ${label} decision could not be restored safely. Keep it and contact the administrator.`)
const bytes = value => new TextEncoder().encode(value).length
const exact = (value,keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key))


function keyForActor(actorId) {
 if(typeof actorId !== 'string' || !UUID.test(actorId)) throw unsafe()
 return namespace + ':' + actorId
}
function read(actorId, storage=localStorage) {
  const address=keyForActor(actorId)
  try {
    const raw=storage.getItem(address)
    if(raw===null) return null
    if(bytes(raw)>65536) throw unsafe()
    const saved=JSON.parse(raw)
    if(!exact(saved,['actorId','key','payloadText','state']) || saved.actorId!==actorId
      || typeof saved.key !== 'string' || !UUID.test(saved.key) || saved.state!=='pending') throw unsafe()
    validatePayloadText(saved.payloadText)
    return saved
  } catch { throw unsafe() }
}

function hold(actorId,key,payloadText,storage=localStorage) {
  const address=keyForActor(actorId)
  validatePayloadText(payloadText)
  if(typeof key !== 'string' || !UUID.test(key)) throw unsafe()
  const previous=read(actorId,storage)
  if(previous) {
    if(previous.key!==key || previous.payloadText!==payloadText) throw new Error(`A ${label} decision is pending. Retry the same saved request before changing it.`)
    return previous
  }
  const saved={actorId,key,payloadText,state:'pending'},raw=JSON.stringify(saved)
  try {
    if(bytes(raw)>65536) throw unsafe()
    storage.setItem(address,raw)
    if(storage.getItem(address)!==raw) throw unsafe()
  } catch { throw new Error(`The ${label} decision could not be saved safely in this browser. Nothing was sent; contact the administrator.`) }
  return saved
}

function clear(actorId,key,storage=localStorage) {
  const address=keyForActor(actorId),saved=read(actorId,storage)
  if(!saved || saved.key!==key) return false
  storage.removeItem(address)
  if(storage.getItem(address)!==null) throw unsafe()
  return true
}

return {key:keyForActor,read,hold,clear}
}
