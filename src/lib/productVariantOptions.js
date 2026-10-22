export function variantDimensions(product) {
  const family = product?.family
  if (!family || family.members.length < 2) return []
  const current = product.variantOptions || {}
  return family.axes.flatMap(axis => {
    const values = [...new Set(family.members.map(member => member.options[axis]))]
    if (values.length < 2) return []
    return [{ label: axis, choices: values.map(value => {
      const candidates = family.members.filter(member => member.options[axis] === value)
      // Preserve as many current choices as possible, with stable staff order.
      const score = member => family.axes.reduce((n, other) => n + (other !== axis && member.options[other] === current[other] ? 1 : 0), 0)
      const target = candidates.reduce((best, candidate) => score(candidate) > score(best) ? candidate : best)
      const changes = family.axes.filter(other => other !== axis && target.options[other] !== current[other])
      return { value, sku: target.sku, label: [value, ...changes.map(other => target.options[other])].join(' · '), changedOtherDimensions: changes.length > 0 }
    }) }]
  })
}

export function fixedVariantDetails(product) {
  const family = product?.family
  if (!family || !family.members.length) return []
  const current = product.variantOptions || {}
  return family.axes.flatMap(axis => {
    const values = [...new Set(family.members.map(member => member.options[axis]))]
    if (values.length !== 1 || current[axis] !== values[0]) return []
    return [{ label: axis, value: current[axis] }]
  })
}
