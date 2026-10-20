(function(root){
 'use strict';
 const G=root.SavingsCalculator,C=root.CalculatorCosts,M=root.MoneyControls;
 const $=id=>document.getElementById(id);
 const sync=(input,value)=>{if(document.activeElement!==input)input.value=String(value);};
 const money=(minor,currency)=>currency+' '+new Intl.NumberFormat('en-HK',{minimumFractionDigits:2,maximumFractionDigits:2}).format(minor/100);
 function render(state,ranges){
  const box=$('insurance-items'),ids=new Set(state.insuranceItems.map(row=>row.id));
  for(const node of [...box.children])if(!ids.has(node.dataset.insuranceId))node.remove();
  state.insuranceItems.forEach((row,i)=>{
   let node=[...box.children].find(node=>node.dataset.insuranceId===row.id);const config=C.control(row);
   if(!node){
    node=document.createElement('div');node.className='income-row insurance-row';node.dataset.insuranceId=row.id;
    node.innerHTML=`<div class="income-head"><div class="income-name-field"><label class="name-label" for="insurance-name-${row.id}">名稱</label><input class="income-name" id="insurance-name-${row.id}" data-insurance-name="${row.id}" maxlength="60" type="text" autocomplete="off"></div><button type="button" data-remove-insurance="${row.id}">移除</button></div><div class="frequency-line"><label for="insurance-frequency-${row.id}">金額單位</label><select id="insurance-frequency-${row.id}" data-insurance-frequency="${row.id}"><option value="monthly">按月</option><option value="annual">按年</option><option value="" hidden>請選擇</option></select></div><div id="control-insurance-${row.id}"></div><p class="help" id="insurance-reserve-${row.id}"></p>`;
    box.appendChild(node);M.mount($('control-insurance-'+row.id),{...config,label:'每期保費'});
   }
   const name=$('insurance-name-'+row.id),label=row.name.trim()||'保險 '+(i+1);
   sync(name,row.name);name.placeholder='保險名稱，例如醫療／人壽';name.setAttribute('aria-label','保險 '+(i+1)+' 名稱');
   sync($('insurance-frequency-'+row.id),row.frequency);$('insurance-frequency-'+row.id).setAttribute('aria-label',label+'金額單位');
   node.querySelector('[data-remove-insurance]').setAttribute('aria-label','移除保險 '+(i+1));
   ranges[config.key]=Math.max(ranges[config.key]||0,config.defaultMax);M.render(config.key,row.amount,ranges,state.currency);
   node.querySelector('.money-head label').textContent=row.frequency==='annual'?'我每年保費':'我每月保費／預留';
   $(config.id).setAttribute('aria-label',label+(row.frequency==='annual'?'每年':'每月')+'保費，精確金額');$(config.rangeId).setAttribute('aria-label',label+'保費');
   node.querySelector('[data-expand]').setAttribute('aria-label','擴大'+label+'保費 slider 範圍');
   $('insurance-reserve-'+row.id).textContent=G.amountOK(row.amount)&&['monthly','annual'].includes(row.frequency)?'每月預留 '+money(G.monthlyReserve(row.amount,row.frequency==='annual'?12:1),state.currency):'';
  });
  $('insurance-heading').textContent=`我嘅保險（${state.insuranceItems.length}項）`;
  $('insurance-empty').hidden=state.insuranceItems.length>0;$('add-insurance').disabled=state.insuranceItems.length>=12;
  $('insurance-total').textContent=G.amountOK(state.billItems.insurance)?money(G.cents(state.billItems.insurance),state.currency):'—';
  $('bill-rates-hint').textContent='季額÷3，每月預留 '+(G.amountOK(state.billItems.rates)?money(G.cents(state.billItems.rates),state.currency):'—')+'（非付款日）';
 }
 root.CostControls={render};
})(typeof window==='undefined'?globalThis:window);
