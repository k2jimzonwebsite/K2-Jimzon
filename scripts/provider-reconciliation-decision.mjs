// IDEA-20261009-08 / MAP-018: offline current-state interpretation only.
// No transport/history atomicity contract has been qualified. Every installation
// outcome therefore stays UNKNOWN, including AFTER plus exact stored SQL bytes.
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { prepareProviderRequest } from '../docs/evidence/20261009-workspace-maintenance/provider-request.mjs';

const project = { id: 'pixplcjqivlfflickobf', status: 'ACTIVE_HEALTHY', version: '17.6.1.155' };
const querySha256 = 'a1646de7e381a0e5c4e2e7ff71e761ebf0120c5226ca9e0f43938084b27ce55e';
const packageSha256 = 'ddf4def0eceb753480eb4e36c4d775e665b868b9ede62e49dbc74a7832904ac9';
const beforeSha256 = '87941b6c79455be42391d9fb2b9a02eebc650f9ee6b1124b9aac2509526ff963';
const afterSha256 = '1d7ff4a4339029a42786df660edf70a81c012132679219121ce350d0008aae2e';
const sha = text => createHash('sha256').update(text).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function classifyProviderReadback({ packageText, beforeCatalogText, afterCatalogText, observation }) {
  const pkg = JSON.parse(packageText);
  const request = prepareProviderRequest(pkg, project);
  if (sha(packageText) !== packageSha256) throw Error('REVIEWED_PACKAGE_BYTES_REQUIRED');
  if (typeof beforeCatalogText !== 'string' || typeof afterCatalogText !== 'string' ||
      sha(beforeCatalogText) !== beforeSha256 || sha(afterCatalogText) !== afterSha256) {
    throw Error('REVIEWED_CATALOG_BYTES_REQUIRED');
  }
  const before = JSON.parse(beforeCatalogText);
  const after = JSON.parse(afterCatalogText);
  const result = (snapshot, history) => Object.freeze({
    snapshot, history, outcome: 'UNKNOWN', automaticRetryAllowed: false,
    limitation: 'ACTUAL_MIGRATION_TRANSPORT_AND_HISTORY_ATOMICITY_UNQUALIFIED',
  });
  if (observation?.projectObservation?.id !== project.id ||
      observation.projectObservation.status !== project.status ||
      observation.projectObservation.version !== project.version ||
      observation.readOnly !== true || observation.providerWrites !== false ||
      observation.providerMigrationRequestsDispatched !== false ||
      observation.queryDispatched !== true || observation.querySha256 !== querySha256) {
    return result('UNBOUND', 'UNREADABLE');
  }
  if (!Number.isInteger(observation.httpStatus) || observation.httpStatus < 200 ||
      observation.httpStatus >= 300 || !Array.isArray(observation.response) ||
      observation.response.length !== 1) return result('UNREADABLE', 'UNREADABLE');
  const data = observation.response[0]?.fresh_provider_readback;
  if (!object(data) || data.role !== 'supabase_read_only_user' || data.version !== '170006' ||
      !object(data.catalog) || !object(data.globalAuthority) || !object(data.managedAuthority) ||
      !Object.keys(before).every(key => Object.hasOwn(data.catalog, key)) ||
      !Object.keys(pkg.authority).every(key => Array.isArray(data.globalAuthority[key])) ||
      !Object.keys(pkg.managedAuthority).every(key => typeof data.managedAuthority[key] === 'string') ||
      !Array.isArray(data.migrationReceipts)) return result('UNREADABLE', 'UNREADABLE');
  const authorityMatches = isDeepStrictEqual(data.globalAuthority, pkg.authority) &&
    isDeepStrictEqual(data.managedAuthority, pkg.managedAuthority);
  const snapshot = authorityMatches && isDeepStrictEqual(data.catalog, before) ? 'BEFORE' :
    authorityMatches && isDeepStrictEqual(data.catalog, after) ? 'AFTER' : 'DRIFT';
  if (data.migrationReceipts.length === 0) return result(snapshot, 'ABSENT');
  if (data.migrationReceipts.length !== 1) return result(snapshot, 'AMBIGUOUS');
  const receipt = data.migrationReceipts[0];
  if (!object(receipt) || receipt.name !== request.name || typeof receipt.version !== 'string' ||
      !receipt.version || !Number.isInteger(receipt.statementCount) || receipt.statementCount < 1 ||
      !Array.isArray(receipt.statementPins) || receipt.statementCount !== receipt.statementPins.length ||
      !receipt.statementPins.every((pin, index) => object(pin) && pin.ordinal === index + 1 &&
        Number.isInteger(pin.bytes) && pin.bytes >= 0 && /^[a-f0-9]{64}$/.test(pin.sha256))) {
    return result(snapshot, 'UNREADABLE');
  }
  const pin = receipt.statementPins[0];
  return result(snapshot, receipt.statementCount === 1 && pin.bytes === Buffer.byteLength(request.query) &&
    pin.sha256 === pkg.sqlSha256 ? 'EXACT_REQUEST_STATEMENT' : 'OTHER_STATEMENTS');
}
