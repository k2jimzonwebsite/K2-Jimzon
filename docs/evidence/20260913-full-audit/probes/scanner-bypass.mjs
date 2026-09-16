import assert from 'node:assert/strict';import{scanText}from'../../../../scripts/secret-scan-core.mjs';
const assignment='K2_ADMIN_BFF_REQUEST_SECRET='+'Ab9Z7qL2exampleT8V4N6R3P1S5';
const findings=scanText(assignment,'fabricated.env');console.log(JSON.stringify({fabricated:true,expectedDetected:true,actualFindings:findings}));assert.ok(findings.length>0,'Non-placeholder assigned secret containing example is silently exempted');

