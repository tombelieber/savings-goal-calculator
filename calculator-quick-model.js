(function(root){
 'use strict';
 const G=root.SavingsCalculator,B=root.CalculatorBills,I=root.CalculatorIncome,C=root.CalculatorCosts;
 const keys=['goal','months','startCash','income','spending','bills'];
 const costKinds=['housing','management','electricity','water','gas','mobile','internet','rates','insurance','other'];
 const copy=value=>JSON.parse(JSON.stringify(value));
 function seed(snapshot){
  const s=snapshot?.state;
  let months=12;try{if(s)months=G.monthRange(s.startMonth,s.endMonth).length;}catch{}
  const amount=value=>G.amountOK(value)?Number(value):'';
  return {goal:s?amount(s.goal):300000,months,startCash:s?amount(s.startCash):0,income:s?amount(G.incomeTotal(s)/100):'',spending:s?amount(s.spendingMonthly):'',bills:s?amount(s.billsMonthly):''};
 }
 function valid(key,value){return key==='months'?/^\d+$/.test(String(value))&&Number(value)>=1&&Number(value)<=60:G.amountOK(value);}
 function details(snapshot){
  const s=snapshot?.state,costs=[];
  if(s?.billSource!=='legacy'&&s?.billItems){
   for(const kind of costKinds){
    if(kind==='insurance'){for(const row of s.insuranceItems||[])costs.push({kind,name:row.name,amount:row.amount,frequency:row.frequency});}
    else if(G.utilityKeys.includes(kind)){const row=s.utilityPayments?.[kind];if(Number(row?.amount)>0)costs.push({kind,...row});}
    else {const amount=kind==='rates'?s.ratesQuarterly:s.billItems[kind];if(Number(amount)>0)costs.push({kind,amount});}
   }
  }
  return {incomeUsed:false,costsUsed:false,income:(s?.oneOffs||[]).map((row,i)=>({id:'r'+(i+1),kind:'once',amount:row.amount,month:row.month})),costs:costs.map((row,i)=>({...row,id:'r'+(i+1)}))};
 }
 function cleanDetails(value){
  if(!value||typeof value.incomeUsed!=='boolean'||typeof value.costsUsed!=='boolean')return null;
  const result={incomeUsed:value.incomeUsed,costsUsed:value.costsUsed};
  for(const type of ['income','costs']){
   if(!Array.isArray(value[type])||value[type].length>24)return null;
   const ids=new Set();result[type]=[];
   for(const row of value[type]){
    if(!row||!/^r\d{1,4}$/.test(row.id)||ids.has(row.id)||!(type==='income'?['monthly','once']:costKinds).includes(row.kind))return null;
    if(!['string','number'].includes(typeof row.amount)||String(row.amount).length>32)return null;
    ids.add(row.id);const clean={id:row.id,kind:row.kind,amount:row.amount};
    for(const key of ['name','month','nextMonth','frequency'])if(row[key]!==undefined){if(typeof row[key]!=='string'||row[key].length>(key==='name'?60:16))return null;clean[key]=row[key];}
    if(row.every!==undefined){if(!G.paymentPeriods.includes(row.every))return null;clean.every=row.every;}
    for(const key of ['confirmed','estimated'])if(row[key]!==undefined){if(typeof row[key]!=='boolean')return null;clean[key]=row[key];}
    result[type].push(clean);
   }
  }
  return result;
 }
 function cleanDraft(raw){
  if(![1,2,3].includes(raw?.version)||!['onboarding','full','results'].includes(raw.view))return null;
  if(raw.view!=='onboarding')return {version:3,view:raw.view};
  const limit=raw.version===1?6:raw.version===2?8:7;
  if(!Number.isInteger(raw.step)||raw.step<0||raw.step>=limit||!raw.values||typeof raw.values!=='object')return null;
  const values={};for(const key of keys){const v=raw.values[key];if(!['number','string'].includes(typeof v)||String(v).length>32)return null;values[key]=v;}
  const extra=raw.version===1?null:cleanDetails(raw.details);if(raw.version!==1&&!extra)return null;
  if(raw.version===3&&!['total','detail'].includes(raw.billMode))return null;
  const step=raw.version===2&&raw.step===7?5:raw.step;
  const billMode=raw.version===3?raw.billMode:raw.version===2&&(raw.step===7||extra.costsUsed)?'detail':null;
  return {version:3,view:'onboarding',step,values,details:extra,billMode};
 }
 function apply(snapshot,values,extra,billMode){
  const s=snapshot?copy(snapshot.state):{...G.example(),monthlyIncome:'',otherMonthly:0,spendingMonthly:'',billsMonthly:'',taxTotal:0,oneOffs:[]};
  for(const key of ['goal','startCash','spending'])if(valid(key,values[key]))s[key==='spending'?'spendingMonthly':key]=Number(values[key]);
  if(valid('months',values.months))s.endMonth=G.shiftMonth(s.startMonth,Number(values.months)-1);
  if(!snapshot||valid('income',values.income)&&G.cents(values.income)!==G.incomeTotal(s)){
   s.incomeItems=[{id:'salary',name:'我每個月收入',amount:valid('income',values.income)?Number(values.income):''}];I.syncTotals(s);
  }
  if(!snapshot||billMode==='total'||valid('bills',values.bills)&&G.cents(values.bills)!==G.cents(s.billsMonthly)){
   s.billItems={...B.empty(),other:valid('bills',values.bills)?Number(values.bills):''};s.billSource='legacy';
   C.initialise(s,{ratesQuarterly:0,insuranceItems:[]});
  }
  if(extra?.incomeUsed){
   s.oneOffs=extra.income.filter(row=>row.kind==='once').map(row=>({amount:row.amount,month:row.month}));
   for(const row of extra.income.filter(row=>row.kind==='monthly')){const added=I.add(s);if(!added)throw new Error('每月收入最多 12 筆。');added.name=row.name||'額外收入';added.amount=row.amount;}I.syncTotals(s);
  }
  if(extra?.costsUsed){
   s.billItems=B.empty();const insuranceItems=[],utilityPayments={};let ratesQuarterly=0;
   for(const row of extra.costs){
    if(row.kind==='insurance')insuranceItems.push({id:row.id,name:row.name||'保險',amount:row.amount,frequency:row.frequency});
    else if(row.kind==='rates')ratesQuarterly=row.amount;
    else if(G.utilityKeys.includes(row.kind))utilityPayments[row.kind]={amount:row.amount,every:row.every,nextMonth:row.nextMonth,confirmed:row.confirmed===true,estimated:row.estimated!==false,amountSource:'entered'};
    else s.billItems[row.kind]=row.amount;
   }
   for(const kind of G.utilityKeys)utilityPayments[kind]??={amount:0,every:kind==='water'?4:2,nextMonth:s.startMonth,confirmed:false,estimated:true,amountSource:'entered'};
   C.initialise(s,{ratesQuarterly,insuranceItems,utilityPayments});s.billSource='custom';
  }
  return {state:s,plan:snapshot?copy(snapshot.plan):{monthlyNet:0,onceNet:0}};
 }
 function detailError(snapshot,values,extra,type){
  const rows=extra[type];
  if(rows.some(row=>!G.amountOK(row.amount)))return '金額請填 0 或以上，最多兩位小數。';
  if(type==='income'){
   if(rows.filter(row=>row.kind==='once').length>12)return 'Bonus／一次性收入最多 12 筆。';
   if(rows.filter(row=>row.kind==='monthly').length+apply(snapshot,values).state.incomeItems.length>12)return '每月收入最多 12 筆。';
   for(const row of rows.filter(row=>row.kind==='once'))try{G.shiftMonth(row.month,0);}catch{return '請揀 Bonus／一次性收入嘅到手月份。';}
  }else{
   const unique=rows.filter(row=>row.kind!=='insurance').map(row=>row.kind);
   if(new Set(unique).size!==unique.length||rows.filter(row=>row.kind==='insurance').length>12)return '同類帳單只需填一項；保險最多 12 項。';
   for(const row of rows){
    if(row.kind==='insurance'&&!['monthly','annual'].includes(row.frequency))return '請揀保險月繳或年繳。';
    if(G.utilityKeys.includes(row.kind)){if(!G.paymentPeriods.includes(row.every))return '請揀付款週期。';try{G.shiftMonth(row.nextMonth,0);}catch{return '請揀水電煤嘅下次付款月份。';}}
   }
  }
  return '';
 }
 root.QuickPlan={keys,seed,valid,cleanDraft,apply,details,detailError};
 if(typeof module!=='undefined')module.exports=root.QuickPlan;
})(typeof window==='undefined'?globalThis:window);
