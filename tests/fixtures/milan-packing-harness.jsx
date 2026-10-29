import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import ConsignmentPackingWorkspace from '../../src/views/admin/ConsignmentPackingWorkspace'
import { getAdminConsignments } from '../../src/services/adminBffService'
import '../../src/index.css'
function Harness(){
 const [manifest,setManifest]=useState(null),[actor,setActor]=useState('11111111-1111-4111-8111-111111111111')
 const refresh=async()=>{const r=await getAdminConsignments();if(r.ok)setManifest(r.data.consignments[0])}
 useEffect(()=>{refresh()},[])
 return <main className="admin-ui min-h-screen bg-adm-bg p-4 text-white font-sans"><button onClick={()=>setActor('22222222-2222-4222-8222-222222222222')}>Switch staff</button>{manifest&&<ConsignmentPackingWorkspace manifest={manifest} products={[]} actorId={actor} onRefresh={refresh}/>}</main>
}
createRoot(document.getElementById('root')).render(<Harness/> )
