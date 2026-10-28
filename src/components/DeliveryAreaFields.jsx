const areaLabel = places => places.every(place => place.level === 'Reg') ? 'Region'
  : places.every(place => place.level === 'Bgy') ? 'Barangay'
    : places.every(place => place.level === 'SubMun') ? 'City district'
      : places.every(place => place.level === 'Prov') ? 'Province' : 'City, municipality or area'

export default function DeliveryAreaFields({ area, idPrefix = 'delivery-area', disabled = false, onChoose, showRetry = true }) {
  return <fieldset className="space-y-3" disabled={disabled}>
    <legend className="text-sm font-semibold">Delivery area</legend>
    {area.levels.map((places, index) => <div key={`${index}-${places[0]?.code}`} className="text-sm font-semibold">
      <label htmlFor={`${idPrefix}-${index}`}>{areaLabel(places)}</label>
      <select id={`${idPrefix}-${index}`} className="store-field mt-1.5 min-h-11 w-full min-w-0 px-3 text-base"
        value={area.path[index]?.code || ''} onChange={event => (onChoose || area.choose)(index, event.target.value)}>
        <option value="">Choose {areaLabel(places).toLowerCase()}</option>
        {places.map(place => <option key={place.code} value={place.code}>{place.name}</option>)}
      </select>
    </div>)}
    {area.loading && <p role="status" className="text-sm text-navy-soft">Loading delivery areas…</p>}
    {area.error && <p role="alert" className="text-sm text-crimson">{area.error}</p>}
    {showRetry && area.error && <button type="button" className="min-h-11 rounded-lg border border-line px-3 text-sm font-semibold" onClick={area.retry}>Retry delivery areas</button>}
  </fieldset>
}
