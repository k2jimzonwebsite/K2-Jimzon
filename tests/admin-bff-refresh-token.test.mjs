import test from 'node:test'
import assert from 'node:assert/strict'
import {
 prepareActiveSession, setPreparedActiveSessionCookies, readActiveSession,
 setPendingCookie, readPendingSession, setRecoverySessionCookies, readRecoverySession,
 refreshActiveSessionCookie,
} from '../server/admin-bff/security.js'
const identity={userId:'e74a4161-72ca-4d72-8f59-37aa690e1869',role:'Staff'}
const auth=refresh=>({access_token:'a'.repeat(32),refresh_token:refresh,expires_at:Math.floor(Date.now()/1000)+3600})
const response=()=>({headers:{},setHeader(name,value){this.headers[name]=value}})
const request=res=>({headers:{cookie:[res.headers['Set-Cookie']].flat().map(v=>v.split(';')[0]).join('; ')}})
test('protocol-valid 12-character refresh token survives all Admin encrypted session boundaries',()=>{
 const old=process.env.K2_SESSION_COOKIE_KEY;process.env.K2_SESSION_COOKIE_KEY=Buffer.alloc(32,9).toString('base64')
 try{
  for(const refresh of ['r'.repeat(12),'r'.repeat(32)]){
   const session=auth(refresh),active=response(),prepared=prepareActiveSession(session,identity)
   setPreparedActiveSessionCookies(active,prepared);assert.equal(readActiveSession(request(active)).refreshToken,refresh)
   const renewed=response();refreshActiveSessionCookie(renewed,session,prepared.session);assert.equal(readActiveSession(request(renewed)).refreshToken,refresh)
   const pending=response();setPendingCookie(pending,session);assert.equal(readPendingSession(request(pending)).refreshToken,refresh)
   const recovery=response();setRecoverySessionCookies(recovery,session,identity);assert.equal(readRecoverySession(request(recovery)).refreshToken,refresh)
  }
 }finally{if(old===undefined)delete process.env.K2_SESSION_COOKIE_KEY;else process.env.K2_SESSION_COOKIE_KEY=old}
})
test('refresh lower/upper bounds and access-token lower bound still refuse malformed sessions',()=>{
 for(const refresh of ['', 'r'.repeat(11),'r'.repeat(16385)])assert.throws(()=>prepareActiveSession(auth(refresh),identity),/AUTH_SESSION_INVALID/)
 assert.throws(()=>prepareActiveSession({...auth('r'.repeat(12)),access_token:'a'.repeat(15)},identity),/AUTH_SESSION_INVALID/)
})
