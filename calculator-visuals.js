(function(root){
 'use strict';
 const G=root.SavingsCalculator;
 const format=minor=>new Intl.NumberFormat('en-HK',{minimumFractionDigits:2,maximumFractionDigits:2}).format(minor/100);
 const month=value=>Number(value.slice(0,4))+'年'+Number(value.slice(5))+'月';
 const percent=value=>new Intl.NumberFormat('en-HK',{maximumFractionDigits:1}).format(value)+'%';
 function data(state,result){
  return {currency:state.currency,startMonth:state.startMonth,endMonth:state.endMonth,start:result.startCash,ending:result.ending,goal:G.cents(state.goal),provisional:state.utilityPayments&&G.utilityKeys.some(key=>Number(state.utilityPayments[key].amount)>0&&!state.utilityPayments[key].confirmed),income:result.totalIncome,outflows:result.totalSpending+result.totalBills+result.totalTax,growth:result.growth,
   parts:[{key:'net',label:'新增淨儲蓄',value:result.growth},{key:'bills',label:'住屋及帳單',value:result.totalBills},{key:'spending',label:'個人消費',value:result.totalSpending},{key:'tax',label:'稅金預留',value:result.totalTax}]};
 }
 function progress(summary,view){
  const value=view==='start'?summary.start:summary.ending,ratio=summary.goal>0?Math.max(0,Math.min(100,value/summary.goal*100)):(value>=0?100:0);
  return {value,ratio,gap:Math.max(0,summary.goal-value),surplus:Math.max(0,value-summary.goal)};
 }
 function create(container){
  let summary=null,selected='net';
  container.innerHTML='<div class="visual-block"><div class="visual-head"><h3>我嘅收入點分配？</h3><span class="read-label">計算結果</span></div><p class="visual-help" id="allocation-scope"></p><div id="allocation-chart"></div><div class="allocation-detail" id="allocation-detail" aria-live="polite"></div><p class="visual-help" id="allocation-note"></p></div><div class="visual-block" id="progress-explainer"><h3 id="progress-title"></h3><p class="visual-help" id="goal-provisional"></p><div class="goal-amounts" aria-live="polite"><div><span>到時我會有</span><strong id="goal-projected"></strong></div><div><span id="goal-gap-label">仲差</span><strong id="goal-gap"></strong></div></div><div class="track" id="goal-progress" role="progressbar" aria-label="目標完成度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="goal-progress-fill"></span></div><div class="goal-progress-caption"><span id="goal-progress-percent"></span><span id="goal-progress-target"></span></div></div>';
  const $=id=>container.querySelector('#'+id),money=value=>summary.currency+' '+format(value);
  function draw(){
   if(!summary)return;
   $('allocation-scope').textContent='總收入 '+money(summary.income)+'；唔包括起始儲蓄。';
   if(summary.income>0&&summary.growth>=0){
    const circumference=2*Math.PI*56;let offset=0;
    const ring=summary.parts.filter(part=>part.value>0).map(part=>{
     const length=part.value/summary.income*circumference,markup=`<circle class="allocation-segment allocation-${part.key}" data-slice="${part.key}" data-value="${part.value}" aria-selected="${part.key===selected}" cx="80" cy="80" r="56" transform="rotate(-90 80 80)" stroke-dasharray="${length} ${circumference-length}" stroke-dashoffset="${-offset}"/>`;offset+=length;return markup;
    }).join('');
    $('allocation-chart').innerHTML=`<div class="allocation-layout"><div class="allocation-ring"><svg viewBox="0 0 160 160" role="img" aria-label="期間收入分配；各分類金額及比例見右方按鈕"><circle class="donut-track" cx="80" cy="80" r="56"/>${ring}<text class="donut-number" x="80" y="78" text-anchor="middle">${percent(summary.growth/summary.income*100)}</text><text class="donut-label" x="80" y="96" text-anchor="middle">收入淨留低</text></svg></div><div class="allocation-legend">${summary.parts.map(part=>`<button type="button" data-slice="${part.key}" aria-pressed="${part.key===selected}" aria-label="${part.label} ${money(part.value)}，佔期間收入 ${percent(part.value/summary.income*100)}"><i class="allocation-swatch allocation-${part.key}"></i><span class="allocation-name">${part.label}</span><span class="allocation-share">${percent(part.value/summary.income*100)}</span><span class="legend-more" aria-hidden="true">›</span></button>`).join('')}</div></div>`;
    const chosen=summary.parts.find(part=>part.key===selected)||summary.parts[0];
    $('allocation-detail').innerHTML=`<span>${chosen.label}</span><strong>${money(chosen.value)}</strong>`;
    $('allocation-note').textContent='點分類睇金額。淨儲蓄＝收入−消費−帳單−稅金，含已套用試算。';
   }else if(summary.growth<0){
    const maximum=Math.max(summary.income,summary.outflows,1);
    $('allocation-chart').innerHTML=`<div class="deficit-bars">${[{label:'期間收入',value:summary.income},{label:'全部支出及預留',value:summary.outflows}].map(row=>`<div class="deficit-bar-row"><div class="deficit-bar-label"><span>${row.label}</span><strong>${format(row.value)}</strong></div><div class="deficit-bar-track"><span style="width:${row.value/maximum*100}%"></span></div></div>`).join('')}</div>`;
    $('allocation-detail').innerHTML=`<span>需要原有儲蓄／額外資金</span><strong>${money(-summary.growth)}</strong>`;
    $('allocation-note').textContent='期間支出及預留超過收入，所以用長條比較。所需資金唔代表已有足夠現金；月末不足會喺折線圖顯示。';
   }else{
    $('allocation-chart').innerHTML='<p class="allocation-empty">期間收入同支出都係0。</p>';$('allocation-detail').textContent='';$('allocation-note').textContent='起始儲蓄仍會計入下方目標完成度。';
   }
   const p=progress(summary,'end');
   $('progress-title').textContent='到 '+month(summary.endMonth);
   $('goal-provisional').textContent=summary.provisional?'試算 · 含未核實水電煤付款月':'';
   $('goal-projected').textContent=money(p.value);
   $('goal-gap-label').textContent=p.surplus?'超出目標':p.gap?'仲差':'已達標';
   $('goal-gap').textContent=money(p.gap||p.surplus);
   $('goal-progress-fill').style.width=p.ratio+'%';
   $('goal-progress').setAttribute('aria-valuenow',String(p.ratio));
   $('goal-progress').setAttribute('aria-valuetext',money(p.value)+'，目標 '+money(summary.goal)+(p.value<0?'，結餘不足':p.surplus?'，已超出目標':''));
   $('goal-progress-percent').textContent=p.value<0?'結餘不足':p.surplus?'已達標':percent(p.ratio)+' 達成';
   $('goal-progress-target').textContent='目標 '+money(summary.goal);

  }
  container.addEventListener('click',event=>{const slice=event.target.closest('[data-slice]');if(slice&&summary){selected=slice.dataset.slice;draw();container.querySelector(`button[data-slice="${selected}"]`)?.focus();}});
  return {render(state,result){summary=data(state,result);container.hidden=false;draw();},clear(){summary=null;container.hidden=true;}};
 }
 root.SavingsVisuals={data,progress,create};
 if(typeof module!=='undefined')module.exports=root.SavingsVisuals;
})(typeof window==='undefined'?globalThis:window);
