import {test,expect} from '@playwright/test'
import {spawnSync} from 'node:child_process'

// Isolate Date replacement in a child; exercise the production validator unchanged.
function validateAt(now,dates,tz='UTC') {
  const program=`const RealDate=Date;const now=${JSON.stringify(now)};
    globalThis.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[now]))}static now(){return RealDate.parse(now)}};
    const {validateConsignmentCommand}=await import('./server/admin-bff/consignments.js');
    console.log(JSON.stringify(${JSON.stringify(dates)}.map(bestBeforeDate=>{
      try{return {date:bestBeforeDate,result:validateConsignmentCommand('consignment_add_line',{
        consignmentId:'10000000-0000-4000-8000-000000000001',sku:'CALENDAR',batchCode:'CAL',boxCode:'CAL',bestBeforeDate,expectedQty:1}).bestBeforeDate}}
      catch(e){return {date:bestBeforeDate,error:e.message}}
    })));`
  const run=spawnSync(process.execPath,['--input-type=module','-e',program],{encoding:'utf8',env:{...process.env,TZ:tz},windowsHide:true})
  expect(run.status,run.stderr).toBe(0)
  return JSON.parse(run.stdout)
}
test('add-line bounds advance at Manila midnight and year-end regardless of host timezone',()=>{
  for(const tz of ['UTC','Pacific/Kiritimati','Etc/GMT+12']){
    expect(validateAt('2026-10-02T15:59:59Z',['2026-10-02','2026-10-01','2036-10-02','2036-10-03'],tz))
      .toEqual([{date:'2026-10-02',result:'2026-10-02'},{date:'2026-10-01',error:'REQUEST_INVALID'},
        {date:'2036-10-02',result:'2036-10-02'},{date:'2036-10-03',error:'REQUEST_INVALID'}])
    expect(validateAt('2026-10-02T16:00:00Z',['2026-10-02','2026-10-03','2036-10-03','2036-10-04'],tz))
      .toEqual([{date:'2026-10-02',error:'REQUEST_INVALID'},{date:'2026-10-03',result:'2026-10-03'},
        {date:'2036-10-03',result:'2036-10-03'},{date:'2036-10-04',error:'REQUEST_INVALID'}])
    expect(validateAt('2026-12-31T16:00:00Z',['2026-12-31','2027-01-01','2037-01-01','2037-01-02'],tz))
      .toEqual([{date:'2026-12-31',error:'REQUEST_INVALID'},{date:'2027-01-01',result:'2027-01-01'},
        {date:'2037-01-01',result:'2037-01-01'},{date:'2037-01-02',error:'REQUEST_INVALID'}])
  }
})
test('add-line keeps the ten-year leap-day rollover ceiling and rejects impossible dates',()=>{
  expect(validateAt('2028-02-28T16:00:00Z',['2028-02-28','2028-02-29','2038-03-01','2038-03-02','2038-02-29','2028-02-30']))
    .toEqual([{date:'2028-02-28',error:'REQUEST_INVALID'},{date:'2028-02-29',result:'2028-02-29'},
      {date:'2038-03-01',result:'2038-03-01'},{date:'2038-03-02',error:'REQUEST_INVALID'},
      {date:'2038-02-29',error:'REQUEST_INVALID'},{date:'2028-02-30',error:'REQUEST_INVALID'}])
})
