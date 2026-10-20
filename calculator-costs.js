(function(root){
 'use strict';
 const G=root.SavingsCalculator,B=root.CalculatorBills;
 const scalar=value=>['string','number'].includes(typeof value)?value:'';
 function sync(state){
  state.billItems.rates=G.amountOK(state.ratesQuarterly)?G.monthlyReserve(state.ratesQuarterly,3)/100:'';
  state.billItems.insurance=state.insuranceItems.every(row=>G.amountOK(row.amount)&&['monthly','annual'].includes(row.frequency))?G.insuranceTotal(state.insuranceItems)/100:'';
  if(state.utilityPayments)for(const key of G.utilityKeys){const row=state.utilityPayments[key];state.billItems[key]=row&&G.amountOK(row.amount)&&G.paymentPeriods.includes(row.every)?G.monthlyReserve(row.amount,row.every)/100:'';}
  B.retotal(state);return state;
 }
 function initialise(state,saved={}){
  state.ratesQuarterly=saved.ratesQuarterly===undefined?(G.amountOK(state.billItems.rates)?G.cents(state.billItems.rates)*3/100:state.billItems.rates):scalar(saved.ratesQuarterly);
  if(Array.isArray(saved.insuranceItems)){
   const ids=new Set();state.insuranceItems=saved.insuranceItems.slice(0,12).map((row,i)=>{
    let id=typeof row?.id==='string'&&/^[a-z][a-z0-9]{0,31}$/.test(row.id)?row.id:'p'+(i+1),n=0;
    while(ids.has(id))id='p'+(i+1)+'x'+(++n);ids.add(id);
    return {id,name:typeof row?.name==='string'?row.name.slice(0,60):'',amount:scalar(row?.amount),frequency:['monthly','annual'].includes(row?.frequency)?row.frequency:''};
   });
  }else state.insuranceItems=Number(state.billItems.insurance)>0?[{id:'legacy',name:'保險',amount:state.billItems.insurance,frequency:'monthly'}]:[];
  state.utilityPayments=Object.fromEntries(G.utilityKeys.map(key=>{
   const existing=saved.utilityPayments?.[key],every=key==='water'?4:2;
   return [key,saved.utilityPayments===undefined?{amount:G.amountOK(state.billItems[key])?G.cents(state.billItems[key])*every/100:state.billItems[key],every,nextMonth:state.startMonth,confirmed:false,estimated:true,amountSource:'legacy-estimate'}:{amount:scalar(existing?.amount),every:existing?.every,nextMonth:typeof existing?.nextMonth==='string'?existing.nextMonth:'',confirmed:existing?.confirmed===true,estimated:existing?.estimated!==false,amountSource:['legacy-estimate','entered','converted'].includes(existing?.amountSource)?existing.amountSource:existing?.estimated===false?'entered':'legacy-estimate'}];
  }));
  return sync(state);
 }
 function control(row){return {key:'insurance-'+row.id,id:row.id==='legacy'?'bill-insurance':'insurance-amount-'+row.id,rangeId:row.id==='legacy'?'bill-slider-insurance':'insurance-slider-'+row.id,defaultMax:row.frequency==='annual'?240000:20000};}
 function add(state){if(state.insuranceItems.length>=12)return null;let i=1;while(state.insuranceItems.some(row=>row.id==='p'+i))i++;const row={id:'p'+i,name:'',amount:0,frequency:'annual'};state.insuranceItems.push(row);sync(state);state.billSource='custom';return row;}
 function update(state,id,field,value){const row=state.insuranceItems.find(row=>row.id===id);if(!row)return;
  if(field==='frequency'&&['monthly','annual'].includes(value)&&row.frequency!==value&&G.amountOK(row.amount)&&['monthly','annual'].includes(row.frequency))row.amount=(value==='annual'?G.cents(row.amount)*12:G.monthlyReserve(row.amount,12))/100;
  row[field]=value;sync(state);state.billSource='custom';
 }
 function remove(state,id){state.insuranceItems=state.insuranceItems.filter(row=>row.id!==id);sync(state);state.billSource='custom';}
 function updateRates(state,value){state.ratesQuarterly=value;sync(state);state.billSource='custom';}
 function updateUtility(state,key,field,value){
  const row=state.utilityPayments[key];if(!row)return;
  if(field==='every'){
   value=Number(value);
   if(G.paymentPeriods.includes(value)&&G.paymentPeriods.includes(row.every)&&G.amountOK(row.amount))row.amount=Math.round(G.cents(row.amount)/row.every*value)/100;
   row.estimated=true;row.amountSource='converted';
  }
  if(field==='amount'){row.estimated=false;row.amountSource='entered';}
  if(field==='nextMonth'){row.confirmed=true;}
  row[field]=value;sync(state);state.billSource='custom';
 }
 root.CalculatorCosts={initialise,sync,control,add,update,remove,updateRates,updateUtility};
 if(typeof module!=='undefined')module.exports=root.CalculatorCosts;
})(typeof window==='undefined'?globalThis:window);
