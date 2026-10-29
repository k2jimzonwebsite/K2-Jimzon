import React from 'react'
import {createRoot} from 'react-dom/client'
import useConsignmentPacking from '../../src/hooks/useConsignmentPacking'
function Harness(){
 const q=useConsignmentPacking({actorId:'11111111-1111-4111-8111-111111111111',onRefresh:async()=>{}})
 const body={operation:'count',consignmentId:'33333333-3333-4333-8333-333333333333',itemId:null,code:'8001234567890',boxCode:'BOX-A',batchCode:'LOT-A',bestBeforeDate:'2027-10-01',delta:1,source:'barcode'}
 return <><button onClick={async()=>{await q.enqueue(body);await q.enqueue(body)}}>Queue two</button><p role="status">{q.entries.length} saved</p><p role="alert">{q.error}</p></>
}
createRoot(document.getElementById('root')).render(<Harness/>);
