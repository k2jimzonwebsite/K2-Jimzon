import {validateProductIntakeCommand} from '../../../../server/admin-bff/product-intake.js';
const id='10000000-0000-4000-8000-000000000001';
for(const quantity of [true,[1],'1']){try{const result=validateProductIntakeCommand('intake_inventory',{sessionId:id,inventoryRequestId:id,source:'flight',inventory:{quantity,unitCost:false,boxCode:'BOX-A',batchCode:'LOT-A',expiryDate:'2027-09-13',isNonExpiry:false,consignmentId:id}});console.log(JSON.stringify({input:{quantity,unitCost:false},accepted:result.inventory}));}catch(e){console.log(JSON.stringify({quantity,rejected:e.message}));}}

