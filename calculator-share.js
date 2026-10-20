(function(root){
 'use strict';
 const G=root.SavingsCalculator,B=root.CalculatorBills,I=root.CalculatorIncome,C=root.CalculatorCosts;
 const limit=16384,fromMinor=value=>{if(!Number.isSafeInteger(value)||value<0||value>1e10)throw new Error('Invalid amount');return value/100;};
 const tuple=(value,length)=>{if(!Array.isArray(value)||value.length!==length)throw new Error('Invalid shape');return value;};
 const list=value=>{if(!Array.isArray(value)||value.length>12)throw new Error('Invalid list');return value;};
 const name=value=>{if(typeof value!=='string'||value.length>60)throw new Error('Invalid name');return value;};
 const date=value=>{if(typeof value!=='string')throw new Error('Invalid month');if(value)G.monthRange(value,value);return value;};
 function pack(state,plan){
  const errors=[...G.validate(state),...G.validatePlan(plan)];if(errors.length)throw new Error(errors[0]);
  return {v:1,c:state.currency,m:[state.startMonth,state.endMonth],a:[state.startCash,state.goal,state.spendingMonthly,state.taxTotal].map(G.cents),i:state.incomeItems.map(row=>[row.name,G.cents(row.amount)]),b:['housing','management','mobile','internet','other'].map(key=>G.cents(state.billItems[key])),r:G.cents(state.ratesQuarterly),p:state.insuranceItems.map(row=>[row.name,G.cents(row.amount),row.frequency==='annual'?'a':'m']),u:G.utilityKeys.map(key=>{const row=state.utilityPayments[key];return [G.cents(row.amount),row.every,row.nextMonth];}),o:state.oneOffs.map(row=>[G.cents(row.amount),row.month]),x:[plan.monthlyNet??0,plan.onceNet??0].map(G.cents)};
 }
 function unpack(value){
  const keys=['v','c','m','a','i','b','r','p','u','o','x'];
  if(!value||typeof value!=='object'||Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key))||value.v!==1||!G.currencies.includes(value.c))throw new Error('Invalid link');
  tuple(value.m,2);tuple(value.a,4);tuple(value.b,5);tuple(value.u,3);tuple(value.x,2);
  const s={version:1,currency:value.c,startMonth:date(value.m[0]),endMonth:date(value.m[1]),startCash:fromMinor(value.a[0]),goal:fromMinor(value.a[1]),spendingMonthly:fromMinor(value.a[2]),taxTotal:fromMinor(value.a[3]),monthlyIncome:0,otherMonthly:0,billsMonthly:0,oneOffs:list(value.o).map(row=>{tuple(row,2);return {amount:fromMinor(row[0]),month:date(row[1])};}),billItems:B.empty(),billSource:'custom'};
  ['housing','management','mobile','internet','other'].forEach((key,i)=>s.billItems[key]=fromMinor(value.b[i]));
  const saved={ratesQuarterly:fromMinor(value.r),insuranceItems:list(value.p).map((row,i)=>{tuple(row,3);if(!['a','m'].includes(row[2]))throw new Error('Invalid frequency');return {id:'p'+(i+1),name:name(row[0]),amount:fromMinor(row[1]),frequency:row[2]==='a'?'annual':'monthly'};}),utilityPayments:Object.fromEntries(G.utilityKeys.map((key,i)=>{const row=tuple(value.u[i],3);if(!G.paymentPeriods.includes(row[1]))throw new Error('Invalid period');return [key,{amount:fromMinor(row[0]),every:row[1],nextMonth:date(row[2]),confirmed:true,estimated:false,amountSource:'entered'}];}))};
  I.initialise(s,list(value.i).map((row,i)=>{tuple(row,2);return {id:i===0?'salary':i===1?'other':'i'+(i+1),name:name(row[0]),amount:fromMinor(row[1])};}));C.initialise(s,saved);
  const plan={monthlyNet:fromMinor(value.x[0]),onceNet:fromMinor(value.x[1])};
  const errors=[...G.validate(s),...G.validatePlan(plan)];if(errors.length)throw new Error(errors[0]);return {state:s,plan};
 }
 function encode(state,plan){
  const bytes=new TextEncoder().encode(JSON.stringify(pack(state,plan)));
  const text=btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  if(text.length>limit)throw new Error('Link too long');return text;
 }
 function decode(text){
  if(typeof text!=='string'||text.length>limit||!text.length||!/^[A-Za-z0-9_-]+$/.test(text))throw new Error('Invalid link');
  const raw=atob(text.replaceAll('-','+').replaceAll('_','/'));
  return unpack(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(raw,c=>c.charCodeAt(0)))));
 }
 function fromHash(hash){return hash.startsWith('#plan=')?decode(hash.slice(6)):null;}
 function url(state,plan,base){const link=new URL(base);if(!['http:','https:'].includes(link.protocol))throw new Error('Invalid site URL');link.search='';link.hash='plan='+encode(state,plan);return link.href;}
 root.PlannerShare={pack,unpack,encode,decode,fromHash,url};
 if(typeof module!=='undefined')module.exports=root.PlannerShare;
})(typeof window==='undefined'?globalThis:window);
