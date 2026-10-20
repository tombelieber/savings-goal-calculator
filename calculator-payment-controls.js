(function(root){
 'use strict';
 const G=root.SavingsCalculator,$=id=>document.getElementById(id);
 const names={electricity:'電費',water:'水費',gas:'煤氣'};
 const sources={electricity:['中電：約60日出單，按賬單到期／扣款月付款。','https://www.clp.com.hk/en/residential/open-electricity-account-residential/first-bill-initial-deposit'],water:['水務署：通常每4個月出單，按實際繳費期限選月。','https://www.esd.wsd.gov.hk/esd/bnc/requestForScenario/requestForScenarioInit.do?USER_LANG=LANG_TC&pageFlag=1'],gas:['煤氣：每2個月出單，付款按單上日期；可改月扣。','https://www.towngas.com/tc/Household/Customer-Services/Billing-Service']};
 function mount(){
  for(const key of G.utilityKeys){
   const node=$('control-bill-'+key);node.classList.add('utility-control');
   const fields=document.createElement('div');fields.className='utility-settings';
   fields.innerHTML=`<div class="payment-fields"><div><label for="payment-every-${key}">我幾耐交一次？</label><select id="payment-every-${key}" data-utility="${key}" data-payment-field="every">${G.paymentPeriods.map(n=>`<option value="${n}">${n===1?'每月':'每'+n+'個月'}</option>`).join('')}<option value="" hidden>請選擇</option></select></div><div><label for="payment-next-${key}">我下次幾月交？</label><input type="month" id="payment-next-${key}" data-utility="${key}" data-payment-field="nextMonth" min="1900-01" max="2200-12"></div></div><p class="payment-status" id="payment-status-${key}"></p><p class="help payment-source"><a href="${sources[key][1]}" target="_blank" rel="noopener noreferrer">${sources[key][0]} ↗</a></p>`;
   node.appendChild(fields);
  }
 }
 function render(state){
  for(const key of G.utilityKeys){
   const row=state.utilityPayments[key],node=$('control-bill-'+key);
   node.querySelector('.money-head label').textContent='我嘅'+names[key]+' · 每次交幾多？';
   $('bill-'+key).setAttribute('aria-label',names[key]+'每次付款金額，精確金額');
   for(const [field,id] of [['every','payment-every-'],['nextMonth','payment-next-']])if(document.activeElement!==$(id+key))$(id+key).value=String(row[field]??'');
   $('payment-every-'+key).setAttribute('aria-label',names[key]+'付款週期');$('payment-next-'+key).setAttribute('aria-label',names[key]+'下次付款月份');
   $('payment-status-'+key).textContent=(row.confirmed?'所選付款月':'示例付款月，請按賬單改')+'；'+(row.amountSource==='converted'?'切換週期會換算每期金額。':row.estimated?'每期金額只係示例。':'每期沿用輸入金額試算。');
  }
 }
 root.PaymentControls={mount,render};
})(typeof window==='undefined'?globalThis:window);
