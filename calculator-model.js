(function(root){
 'use strict';
 const fields=['startCash','goal','monthlyIncome','otherMonthly','spendingMonthly','billsMonthly','taxTotal'];
 const currencies=['HKD','USD','CNY','TWD','EUR','GBP'];
 const cents=value=>Math.round(Number(value)*100);
 const billFields=['housing','management','electricity','water','gas','mobile','internet','rates','insurance','other'];
 const isAmount=value=>((typeof value==='number'&&Math.round(value*100)/100===value)||(typeof value==='string'&&/^-?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(value)))&&Number.isFinite(Number(value));
 const billTotal=items=>billFields.reduce((sum,key)=>sum+cents(items[key]),0);
 const amountOK=value=>isAmount(value)&&Number(value)>=0&&Number(value)<=1e8;
 const incomeTotal=state=>state.incomeItems===undefined?cents(state.monthlyIncome)+cents(state.otherMonthly):state.incomeItems.reduce((sum,row)=>sum+cents(row.amount),0);
 const monthlyReserve=(value,months)=>Math.round(cents(value)/months);
 const utilityKeys=['electricity','water','gas'];
 const paymentPeriods=[1,2,3,4,6,12];
 function paymentDue(row,month){
  if(!cents(row.amount))return false;
  const offset=monthIndex(month)-monthIndex(row.nextMonth);
  return offset>=0&&offset%row.every===0;
 }
 function billsForMonth(state,month){
  let total=cents(state.billsMonthly);
  if(state.utilityPayments)for(const key of utilityKeys){
   const row=state.utilityPayments[key];
   total-=cents(state.billItems[key]);
   if(paymentDue(row,month))total+=cents(row.amount);
  }
  return total;
 }
 const insuranceTotal=items=>items.reduce((sum,row)=>sum+monthlyReserve(row.amount,row.frequency==='annual'?12:1),0);
 function validatePlan(plan){return [plan.monthlyNet??0,plan.onceNet??0].some(value=>!isAmount(value)||Number(value)<0||Number(value)>1e8)?['額外淨收入請填0或正數，最多兩位小數。']:[];}
 function monthIndex(value){
  const match=/^(\d{4})-(0[1-9]|1[0-2])$/.exec(value||'');
  if(!match||Number(match[1])<1900||Number(match[1])>2200)throw new Error('請填有效月份。');
  return Number(match[1])*12+Number(match[2])-1;
 }
 function monthRange(start,end){
  const first=monthIndex(start),last=monthIndex(end),count=last-first+1;
  if(count<1)throw new Error('結束月份必須等於或遲過開始月份。');
  if(count>60)throw new Error('每次最多模擬60個月。');
  return Array.from({length:count},(_,i)=>{const value=first+i;return Math.floor(value/12)+'-'+String(value%12+1).padStart(2,'0');});
 }
 function shiftMonth(start,offset){
  const index=monthIndex(start)+offset;
  return Math.floor(index/12)+'-'+String(index%12+1).padStart(2,'0');
 }
 function defaultMonths(now=new Date()){
  const current=now.getFullYear()*12+now.getMonth(),format=index=>Math.floor(index/12)+'-'+String(index%12+1).padStart(2,'0');
  return {startMonth:format(current+1),endMonth:format(current+12)};
 }
 function example(){return {version:1,currency:'HKD',...defaultMonths(),startCash:0,goal:300000,monthlyIncome:30000,otherMonthly:0,spendingMonthly:5000,billsMonthly:8800,taxTotal:0,oneOffs:[]};}
 function blank(){return {version:1,currency:'HKD',...defaultMonths(),...Object.fromEntries(fields.map(key=>[key,''])),oneOffs:[]};}
 function validate(state){
  if(!state||typeof state!=='object')return ['請填入基本數字。'];
  const errors=[];
  if(!currencies.includes(state.currency))errors.push('請選擇貨幣。');
  for(const key of fields){
   const value=state[key],number=Number(value);
   if(!isAmount(value))errors.push('請填齊有效金額，最多兩位小數；0亦可以。');
   else if(number>1e8||number<0)errors.push('所有輸入金額請填0或正數，並喺可用範圍內。');
  }
  if(state.incomeItems!==undefined){
   const rows=state.incomeItems;
   const valid=Array.isArray(rows)&&rows.length<=12&&rows.every(row=>row&&typeof row.id==='string'&&/^[a-z][a-z0-9]{0,31}$/.test(row.id)&&typeof row.name==='string'&&row.name.length<=60&&amountOK(row.amount));
   if(!valid||new Set(rows?.map?.(row=>row?.id)).size!==rows?.length)errors.push('每月收入最多12筆，金額請填0或正數，最多兩位小數。');
   else if(incomeTotal(state)!==cents(state.monthlyIncome)+cents(state.otherMonthly))errors.push('每月收入合計同拆項唔一致。');
  }
  if(state.billItems!==undefined){
   const valid=state.billItems&&billFields.every(key=>isAmount(state.billItems[key])&&Number(state.billItems[key])>=0&&Number(state.billItems[key])<=1e8);
   if(!valid)errors.push('帳單拆項請填0或正數，最多兩位小數。');
   else if(billTotal(state.billItems)!==cents(state.billsMonthly))errors.push('帳單合計同拆項唔一致。');
  }
  if(state.ratesQuarterly!==undefined){
   if(!amountOK(state.ratesQuarterly))errors.push('差餉／地租季均請填0或正數。');
   else if(!state.billItems||monthlyReserve(state.ratesQuarterly,3)!==cents(state.billItems.rates))errors.push('差餉季度金額同每月預留唔一致。');
  }
  if(state.insuranceItems!==undefined){
   const rows=state.insuranceItems;
   const valid=Array.isArray(rows)&&rows.length<=12&&rows.every(row=>row&&typeof row.id==='string'&&/^[a-z][a-z0-9]{0,31}$/.test(row.id)&&typeof row.name==='string'&&row.name.length<=60&&['monthly','annual'].includes(row.frequency)&&amountOK(row.amount));
   if(!valid||new Set(rows?.map?.(row=>row?.id)).size!==rows?.length)errors.push('保險最多12項，請填有效金額並選擇月繳或年繳。');
   else if(!state.billItems||insuranceTotal(rows)!==cents(state.billItems.insurance))errors.push('保險項目同每月預留唔一致。');
  }
  if(state.utilityPayments!==undefined){
   for(const key of utilityKeys){
    const row=state.utilityPayments?.[key];
    if(!row||!amountOK(row.amount)||!paymentPeriods.includes(row.every))errors.push('水電煤請填有效每期金額及付款週期。');
    else{
     if(!state.billItems||monthlyReserve(row.amount,row.every)!==cents(state.billItems[key]))errors.push('水電煤每期金額同帳單拆項唔一致。');
     if(cents(row.amount)>0||row.nextMonth)try{monthIndex(row.nextMonth);}catch{errors.push('請揀水電煤嘅下次付款月份。');}
    }
   }
  }
  try{monthRange(state.startMonth,state.endMonth);}catch(error){errors.push(error.message);}
  if(!Array.isArray(state.oneOffs)||state.oneOffs.length>12)errors.push('最多加入12筆一次性收入。');
  else for(const row of state.oneOffs){
   if(!row||!isAmount(row.amount)||Number(row.amount)<0||Number(row.amount)>1e8)errors.push('一次性收入請填0或正數，最多兩位小數。');
   if(Number(row?.amount)>0)try{monthIndex(row.month);}catch{errors.push('請揀一次性收入月份。');}
  }
  return [...new Set(errors)];
 }
 function monthlyRow(state,plan,month,index,previousBalance){
  const oneOffIncome=state.oneOffs.filter(row=>row.month===month).reduce((n,row)=>n+cents(row.amount),0);
  const adjustment=cents(plan.monthlyNet??0)+(month===state.endMonth?cents(plan.onceNet??0):0);
  const income=incomeTotal(state)+oneOffIncome+adjustment,spending=cents(state.spendingMonthly);
  const savingsIn=income-spending,bills=billsForMonth(state,month),tax=index===0?cents(state.taxTotal):0,netChange=savingsIn-bills-tax;
  return {month,income,oneOffIncome,adjustment,spending,savingsIn,bills,tax,netChange,balance:previousBalance+netChange};
 }
 function forecast(state,plan={monthlyNet:0,onceNet:0}){
  const errors=validate(state);if(errors.length)throw new Error(errors[0]);
  const planErrors=validatePlan(plan);if(planErrors.length)throw new Error(planErrors[0]);
  const months=monthRange(state.startMonth,state.endMonth),rows=[];
  let balance=cents(state.startCash),totalIncome=0,totalSavingsIn=0,totalBills=0,totalTax=0,totalSpending=0,totalOneOffIncome=0;
  for(const [index,month] of months.entries()){
   const row=monthlyRow(state,plan,month,index,balance);balance=row.balance;rows.push(row);
   totalIncome+=row.income;totalSavingsIn+=row.savingsIn;totalBills+=row.bills;totalTax+=row.tax;totalSpending+=row.spending;totalOneOffIncome+=row.oneOffIncome;
  }
  const startCash=cents(state.startCash);
  return {rows,startCash,ending:balance,growth:balance-startCash,totalIncome,totalSavingsIn,totalBills,totalTax,totalSpending,totalOneOffIncome,excludedOneOffs:state.oneOffs.filter(row=>Number(row.amount)>0&&!months.includes(row.month)).length};
 }
 function targetReport(state,result=forecast(state)){
  const shortfall=Math.max(0,cents(state.goal)-result.ending),spendingOnlyMaximum=result.ending+result.totalSpending;
  return {shortfall,surplus:Math.max(0,result.ending-cents(state.goal)),onceNeeded:shortfall,monthlyNeeded:Math.ceil(shortfall/result.rows.length),spendingOnlyMaximum,spendingOnlyShortfall:Math.max(0,cents(state.goal)-spendingOnlyMaximum)};
 }
 function estimateGoal(state,plan={monthlyNet:0,onceNet:0}){
  forecast(state,plan); // Apply the same input and plan validation as the selected-period forecast.
  const monthlyNet=incomeTotal(state)+cents(plan.monthlyNet??0)-cents(state.spendingMonthly)-cents(state.billsMonthly);
  const count=Math.min(120,2201*12-monthIndex(state.startMonth));
  let balance=cents(state.startCash);
  for(let index=0;index<count;index++){
   const month=shiftMonth(state.startMonth,index);
   balance=monthlyRow(state,plan,month,index,balance).balance;
   if(balance>=cents(state.goal))return {reached:true,month,months:index+1,balance,monthlyNet,limitMonth:shiftMonth(state.startMonth,count-1)};
  }
  return {reached:false,month:null,months:null,balance,monthlyNet,limitMonth:shiftMonth(state.startMonth,count-1)};
 }
 function projectToGoal(state,plan={monthlyNet:0,onceNet:0}){
  const eta=estimateGoal(state,plan),plannedMonths=monthRange(state.startMonth,state.endMonth).length;
  const count=Math.max(plannedMonths,eta.reached?eta.months:Math.min(120,2201*12-monthIndex(state.startMonth)));
  const rows=[],baselineRows=[];let balance=cents(state.startCash),baseline=balance;
  for(let index=0;index<count;index++){
   const month=shiftMonth(state.startMonth,index),row=monthlyRow(state,plan,month,index,balance),base=monthlyRow(state,{monthlyNet:0,onceNet:0},month,index,baseline);
   balance=row.balance;baseline=base.balance;rows.push(row);baselineRows.push(base);
  }
  return {rows,baselineRows,eta,deadlineMonth:state.endMonth,deadlineIndex:plannedMonths-1,extended:count>plannedMonths};
 }
 root.SavingsCalculator={fields,currencies,cents,billFields,billTotal,isAmount,amountOK,incomeTotal,monthlyReserve,insuranceTotal,utilityKeys,paymentPeriods,paymentDue,billsForMonth,validatePlan,monthRange,shiftMonth,defaultMonths,example,blank,validate,forecast,targetReport,estimateGoal,projectToGoal};
 if(typeof module!=='undefined')module.exports=root.SavingsCalculator;
})(typeof window==='undefined'?globalThis:window);
