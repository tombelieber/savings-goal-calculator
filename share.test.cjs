const {test}=require('node:test'),assert=require('node:assert/strict');
const G=require('./calculator-model.js'),B=require('./calculator-bills.js'),I=require('./calculator-income.js'),C=require('./calculator-costs.js'),S=require('./calculator-share.js');
const fixture=()=>C.initialise(I.initialise(B.setExample({...G.example(),startMonth:'2099-01',endMonth:'2099-12'})));
test('share roundtrip retains the exact forecast, all components, unicode names and trials',()=>{
 const s=fixture();I.update(s,'salary',33333.33);s.incomeItems[0].name='虛構收入 🐿';const row=C.add(s);C.update(s,row.id,'name','虛構保障');C.update(s,row.id,'amount',1200.01);C.updateRates(s,99.99);s.oneOffs=[{amount:123.45,month:'2099-06'}];
 const plan={monthlyNet:100.01,onceNet:200.02},restored=S.decode(S.encode(s,plan));
 assert.deepEqual(G.forecast(restored.state,restored.plan),G.forecast(s,plan));assert.equal(restored.state.incomeItems[0].name,'虛構收入 🐿');assert.deepEqual(S.pack(restored.state,restored.plan),S.pack(s,plan));
});
test('shared data lives only in a fragment; query and old anchor are removed and unknown state is never serialized',()=>{
 const s=fixture();s.unrelatedPrivateNote='DO_NOT_INCLUDE';const link=new URL(S.url(s,{},'https://example.test/?old=1#inputs'));
 assert.equal(link.search,'');assert.ok(link.hash.startsWith('#plan='));assert.equal(link.pathname,'/');assert.doesNotMatch(JSON.stringify(S.pack(s,{})),/DO_NOT_INCLUDE|billSource|amountSource/);
 assert.deepEqual(S.fromHash(link.hash).plan,{monthlyNet:0,onceNet:0});assert.equal(S.fromHash('#inputs'),null);assert.throws(()=>S.url(s,{},'file:///example.html'));
});
test('malformed, excessive, unknown-version and invalid monetary payloads are rejected',()=>{
 const p=S.pack(fixture(),{});
 for(const value of [{...p,v:2},{...p,extra:1},{...p,a:[-1,0,0,0]},{...p,a:[0,0,0,1.1]},{...p,m:['2099-01','2098-12']},{...p,u:[[100,5,'2099-01'],...p.u.slice(1)]},{...p,i:Array(13).fill(['x',0])}])assert.throws(()=>S.unpack(value));
 for(const text of ['!','a'.repeat(16385),'e30','8A'])assert.throws(()=>S.decode(text));
});
test('maximum bounded row count and names roundtrip without exponential growth or numeric corruption',()=>{
 const s=fixture();s.incomeItems=[];I.syncTotals(s);for(let i=0;i<12;i++){const row=I.add(s);row.name='虛'.repeat(60);I.update(s,row.id,1.01);}for(let i=0;i<12;i++){const row=C.add(s);C.update(s,row.id,'name','構'.repeat(60));C.update(s,row.id,'amount',12.12);}s.oneOffs=Array.from({length:12},()=>({month:'2099-06',amount:1.01}));
 const encoded=S.encode(s,{});assert.ok(encoded.length<16384);assert.equal(G.forecast(S.decode(encoded).state).ending,G.forecast(s).ending);
});
test('markup-like names remain strings; tuple shapes cannot inject object prototypes',()=>{
 const p=S.pack(fixture(),{});p.i[0][0]='<img src=x onerror=alert(1)> & "test"';const decoded=S.unpack(p);assert.equal(decoded.state.incomeItems[0].name,p.i[0][0]);
 assert.throws(()=>S.unpack({...p,b:{__proto__:{polluted:true}}}));assert.equal({}.polluted,undefined);
});
