'use strict';
const G=SavingsCalculator,B=CalculatorBills,I=CalculatorIncome,C=CalculatorCosts,$=id=>document.getElementById(id),storageKey='savings-plan-public-v1';
const controls=[
 {key:'goal',id:'target',rangeId:'goal-slider',label:'我要儲幾多？',defaultMax:2000000,placeholder:'例如 300,000'},
 {key:'startCash',id:'startCash',rangeId:'cash-slider',label:'我而家已經儲咗',defaultMax:500000,placeholder:'例如 0',hint:'填扣咗欠款同預留款後，可以用嚟達標嘅錢。'},
 {key:'monthlyNet',id:'plan-monthly',rangeId:'income-slider',label:'如果我每個月再多賺',defaultMax:100000,hint:'只係試下：填扣咗新增稅金後，每月多賺嘅錢。'},
 {key:'spendingMonthly',id:'spendingMonthly',rangeId:'spending-slider',label:'我每個月日常使費',defaultMax:100000,placeholder:'例如 5,000',hint:'食飯、交通、購物等。租金、帳單同稅金喺下面填，唔使重複計。'},
 {key:'taxTotal',id:'taxTotal',rangeId:'tax-slider',label:'我要另外留幾多錢交稅？',defaultMax:300000,placeholder:'例如 0',hint:'填成段時間要留起嘅稅金，會喺第一個月扣起。請自行估算，唔會自動計稅。'},
 {key:'onceNet',id:'plan-once',rangeId:'once-slider',label:'如果我到時再有一筆錢',defaultMax:500000,hint:'只係試下：填扣咗新增稅金後嘅金額。'}
];
let quickstart,onboardingPending=false;
let state=C.initialise(I.initialise(B.setExample(G.example()))),plan={monthlyNet:0,onceNet:0},ranges={},mode='example',selected=Infinity,chartMode='balance',base,result,report,eta,trajectory;
const safe=value=>Number.isFinite(Number(value))?Math.max(0,Math.min(1e8,Number(value))):0;
function readSaved(){
 const saved=JSON.parse(localStorage.getItem(storageKey));if(saved?.state?.version!==1)return;
 const candidate=saved.state,clean=G.blank();
 for(const key of G.fields)clean[key]=['string','number'].includes(typeof candidate[key])?candidate[key]:'';
 for(const key of ['startMonth','endMonth'])clean[key]=typeof candidate[key]==='string'?candidate[key]:'';
 clean.currency=G.currencies.includes(candidate.currency)?candidate.currency:'HKD';
 clean.oneOffs=Array.isArray(candidate.oneOffs)?candidate.oneOffs.slice(0,12).filter(row=>row&&typeof row==='object').map(row=>({amount:['string','number'].includes(typeof row.amount)?row.amount:0,month:typeof row.month==='string'?row.month:''})):[];
 state=C.initialise(I.initialise(B.initialise(clean,candidate.billItems,candidate.billSource),candidate.incomeItems),candidate);
 plan=Object.fromEntries(['monthlyNet','onceNet'].map(key=>[key,['number','string'].includes(typeof saved.plan?.[key])?saved.plan[key]:0]));mode=saved.mode==='example'?'example':'custom';
 if(saved.ranges&&typeof saved.ranges==='object')for(const [key,value] of Object.entries(saved.ranges))if(/^(goal|startCash|monthlyIncome|otherMonthly|monthlyNet|spendingMonthly|taxTotal|onceNet|oneoff-\d+|bill-[a-z]+|income-[a-z][a-z0-9]{0,31}|insurance-[a-z][a-z0-9]{0,31})$/.test(key)&&Number.isFinite(Number(value)))ranges[key]=safe(value);
 if(candidate.ratesQuarterly===undefined&&ranges['bill-rates'])ranges['bill-rates']=safe(ranges['bill-rates']*3);
 if(ranges['bill-insurance']){ranges['insurance-legacy']=ranges['bill-insurance'];delete ranges['bill-insurance'];}
 return true;
}
let hasSavedPlan=false;try{hasSavedPlan=Boolean(readSaved());}catch{}
let savedBeforeShared=null,sharedDraft=false;
function releaseInputFocus(){const input=document.activeElement;if(input?.matches('input,select'))input.blur();}
function loadShared(hash){
 const incoming=PlannerShare.fromHash(hash);if(!incoming)return false;releaseInputFocus();
 try{savedBeforeShared=localStorage.getItem(storageKey);}catch{savedBeforeShared=null;}
 state=C.initialise(I.initialise(B.initialise(incoming.state,incoming.state.billItems,'custom'),incoming.state.incomeItems),incoming.state);plan=incoming.plan;mode='custom';sharedDraft=true;selected=Infinity;return true;
}
try{loadShared(location.hash);}catch{$('share-import-note').textContent='分享連結無效，已保留你原有設定。';}
window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#plan='))return;try{if(loadShared(location.hash)){onboardingPending=false;quickstart?.showPlan('results',false);render();}}catch{$('share-import-note').textContent='分享連結無效，已保留你原有設定。';}});

const visuals=SavingsVisuals.create($('plan-visuals'));
const amount=(minor,d=2)=>new Intl.NumberFormat('en-HK',{minimumFractionDigits:d,maximumFractionDigits:d}).format(minor/100);
const money=(minor,d=2)=>state.currency+' '+amount(minor,d);
const monthText=month=>Number(month.slice(0,4))+'年'+Number(month.slice(5))+'月';
const payday=PaydayView.create({get:$,money,monthText});
const activePlan=()=>plan.monthlyNet>0||plan.onceNet>0;
function sync(input,value){if(document.activeElement!==input)input.value=String(value);}
for(const config of controls)MoneyControls.mount($('control-'+config.key),config);
for(const config of B.definitions){
 const slot=document.createElement('div');slot.id='control-bill-'+config.key;$('bill-controls').appendChild(slot);
 MoneyControls.mount(slot,{...config,hint:config.hint,key:'bill-'+config.key,id:'bill-'+config.key,rangeId:'bill-slider-'+config.key});
}
PaymentControls.mount();
function mountIncomes(){
 const root=$('incomes'),ids=new Set(state.incomeItems.map(row=>row.id));
 for(const node of [...root.children])if(!ids.has(node.dataset.incomeId))node.remove();
 state.incomeItems.forEach((row,i)=>{
  let node=[...root.children].find(node=>node.dataset.incomeId===row.id);
  const config=I.control(row);
  if(!node){
   node=document.createElement('div');node.className='income-row';node.dataset.incomeId=row.id;
   node.innerHTML=`<div class="income-head"><div class="income-name-field"><label class="name-label" for="income-name-${row.id}">名稱</label><input class="income-name" id="income-name-${row.id}" data-income-name="${row.id}" type="text" maxlength="60" autocomplete="off"></div><button type="button" data-remove-income="${row.id}">移除</button></div><div id="control-${config.key}"></div>`;
   root.appendChild(node);MoneyControls.mount($('control-'+config.key),{...config,label:'我每個月收幾多？'});
  }
  const name=$('income-name-'+row.id),label=row.name.trim()||'每月收入 '+(i+1);
  sync(name,row.name);name.placeholder='收入名稱，例如薪金／兼職';name.setAttribute('aria-label','每月收入 '+(i+1)+' 名稱');
  node.querySelector('[data-remove-income]').setAttribute('aria-label','移除每月收入 '+(i+1));
  MoneyControls.render(config.key,row.amount,ranges,state.currency);
  $(config.id).setAttribute('aria-label',label+'，每月精確金額');$(config.rangeId).setAttribute('aria-label',label+'，每月金額');
  node.querySelector('[data-expand]').setAttribute('aria-label','擴大'+label+' slider 範圍');
 });
 $('incomes-summary').textContent=`02　我每個月收入（${state.incomeItems.length}筆）`;
 $('incomes-empty').hidden=state.incomeItems.length>0;$('add-income').disabled=state.incomeItems.length>=12;
}
function renderSubtotals(){
 const sum=values=>values.every(G.amountOK)?values.reduce((n,value)=>n+G.cents(value),0):NaN;
 const show=(id,value)=>$(id).textContent=Number.isFinite(value)?money(value):'—';
 show('subtotal-start',G.amountOK(state.goal)&&G.amountOK(state.startCash)?Math.max(0,G.cents(state.goal)-G.cents(state.startCash)):NaN);
 const recurring=sum(state.incomeItems.map(row=>row.amount)),trial=sum([plan.monthlyNet]);
 show('subtotal-income',recurring+trial);
 $('income-subtotal-note').textContent=Number.isFinite(recurring+trial)?`固定收入 ${money(recurring)}${trial?' ＋ 未確認試算 '+money(trial):'；未計 Bonus'}。稅金喺下方另計。`:'';
 let bonus=NaN,excluded=0;
 try{
  const months=G.monthRange(state.startMonth,state.endMonth);
  if(state.oneOffs.every(row=>G.amountOK(row.amount)&&(!Number(row.amount)||G.shiftMonth(row.month,0)))){
   bonus=state.oneOffs.filter(row=>months.includes(row.month)).reduce((n,row)=>n+G.cents(row.amount),0);
   excluded=state.oneOffs.filter(row=>Number(row.amount)>0&&!months.includes(row.month)).length;
  }
 }catch{}
 show('subtotal-bonus',bonus);$('bonus-subtotal-note').textContent=Number.isFinite(bonus)?(excluded?`${excluded} 筆喺期間外，未計入呢個小計。`:'只計所選期間，稅金另計。'):'';
 show('subtotal-spending',sum([state.spendingMonthly]));show('subtotal-tax',sum([state.taxTotal]));show('subtotal-once',sum([plan.onceNet]));
}
function mountOneoffs(){
 const root=$('oneoffs');
 if(root.children.length!==state.oneOffs.length){
  root.replaceChildren();
  state.oneOffs.forEach((_,i)=>{
   const row=document.createElement('div');row.className='oneoff';
   row.innerHTML=`<div class="oneoff-head"><span>Bonus／一次性收入 ${i+1}</span><button type="button" data-remove="${i}" aria-label="移除一次性收入${i+1}">移除</button></div><div id="control-oneoff-${i}"></div><div class="bonus-date"><label for="oneoff-month-${i}">入帳月份</label><input id="oneoff-month-${i}" data-oneoff="${i}" type="month" min="1900-01" max="2200-12"></div>`;
   root.appendChild(row);
   MoneyControls.mount($('control-oneoff-'+i),{key:'oneoff-'+i,id:'oneoff-amount-'+i,rangeId:'bonus-slider-'+i,label:'金額',defaultMax:500000});
  });
 }
 state.oneOffs.forEach((row,i)=>{MoneyControls.render('oneoff-'+i,row.amount,ranges,state.currency);sync($('oneoff-month-'+i),row.month);});
 $('oneoffs-summary').textContent=`03　我嘅 Bonus／額外一筆（${state.oneOffs.length}筆）`;
 $('oneoffs-empty').hidden=state.oneOffs.length>0;$('add-oneoff').disabled=state.oneOffs.length>=12;
}
function syncControls(){
 for(const key of ['currency','startMonth','endMonth'])sync($(key),state[key]);
 for(const config of controls)MoneyControls.render(config.key,G.fields.includes(config.key)?state[config.key]:plan[config.key],ranges,state.currency);
 for(const config of B.definitions)MoneyControls.render('bill-'+config.key,config.key==='rates'?state.ratesQuarterly:G.utilityKeys.includes(config.key)?state.utilityPayments[config.key].amount:state.billItems[config.key],ranges,state.currency);
 $('billsMonthly').textContent='—';
 $('bill-migration-note').textContent=state.billSource==='legacy'?'帳單總額喺「其他帳單／未拆項總額」。填租金等分項時，請將呢筆改成剩餘未分配金額，避免重複計。':'水電煤按付款月扣整筆；其他項目按月支付／預留。';
 $('apply-example-bills').hidden=state.billSource!=='legacy'||G.cents(state.billsMonthly)!==G.billTotal(B.example());
 mountIncomes();mountOneoffs();CostControls.render(state,ranges);PaymentControls.render(state);renderSubtotals();
 try{const months=G.monthRange(state.startMonth,state.endMonth).length;sync($('horizon-slider'),months);$('horizon-value').textContent=months+'個月';}catch{$('horizon-value').textContent='請揀有效月份';}
 try{G.shiftMonth(state.startMonth,0);$('horizon-slider').disabled=false;}catch{$('horizon-slider').disabled=true;}
}
function showMonth(){
 if(!trajectory)return;
 selected=Math.max(0,Math.min(selected,trajectory.rows.length-1));const row=trajectory.rows[selected];
 $('selected-month').textContent=monthText(row.month);$('chart-month').max=String(trajectory.rows.length-1);sync($('chart-month'),selected);
 $('chart-month').disabled=trajectory.rows.length===1;$('chart-month').setAttribute('aria-valuetext',monthText(row.month));
 $('month-detail').innerHTML=`<div class="month-detail-main"><span>月末淨儲蓄</span><strong>${money(row.balance)}</strong></div><dl class="month-stats"><div><dt>入儲蓄</dt><dd>${amount(row.savingsIn)}</dd></div><div><dt>帳單及預留</dt><dd>${amount(row.bills)}</dd></div><div><dt>稅金預留</dt><dd>${amount(row.tax)}</dd></div></dl>`;
 const due=G.utilityKeys.filter(key=>G.paymentDue(state.utilityPayments[key],row.month));
 const payments=due.map(key=>({electricity:'電費',water:'水費',gas:'煤氣'}[key])+' '+money(G.cents(state.utilityPayments[key].amount))).join(' · ');
 const line=document.createElement('p');line.className='help';line.textContent=(row.month>state.endMonth?'期限後預測 · ':'')+(payments||'本月無安排水電煤付款。');$('month-detail').appendChild(line);
 $('month-detail').setAttribute('aria-label',monthText(row.month)+'，全部金額以'+state.currency+'計');SavingsChart.select($('chart'),selected);
 document.querySelectorAll('#month-rows tr').forEach((row,i)=>row.setAttribute('aria-selected',String(i===selected)));
}
function renderChart(){
 if(!result)return;
 const drawing=SavingsChart.draw({result:{rows:trajectory.rows},base:{rows:trajectory.baselineRows},goal:G.cents(state.goal),mode:chartMode,currency:state.currency,deadlineMonth:state.endMonth,achievedMonth:eta.month});
 $('chart').innerHTML=drawing.svg;$('chart-legend').innerHTML=drawing.legend;
 $('chart-period').textContent=state.startMonth.replace('-','/')+' — '+trajectory.rows.at(-1).month.replace('-','/');
 $('chart-horizon-note').textContent=eta.reached?`原定 ${monthText(state.endMonth)}；預計 ${monthText(eta.month)} 首次儲夠。${trajectory.extended?' 淡色區係期限後預測，按目前固定收支延續。':''}`:`預測至 ${monthText(eta.limitMonth)}，仍未達標。可調整收入或支出再試。`;
 document.querySelectorAll('[data-chart-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.chartMode===chartMode)));
}
function persist(){
 if(onboardingPending)return;
 if(sharedDraft){$('save-status').textContent='分享計劃試玩中；按「用呢份做我嘅計劃」先會取代本機設定。';return;}
 try{localStorage.setItem(storageKey,JSON.stringify({state,plan,mode,ranges}));$('save-status').textContent='更改已存喺呢個瀏覽器。';}catch{$('save-status').textContent='目前未能儲存；關閉前請留意。';}
}
function clearResult(){
 base=result=report=eta=trajectory=null;visuals.clear();payday.clear();$('billsMonthly').textContent='—';$('visual-period').textContent='填齊數字後顯示分配同進度。';
 for(const id of ['ending','shortfall','eta','total-in','total-bills','total-tax','final-balance','dock-monthly','dock-eta'])$(id).textContent='—';
 for(const id of ['chart-horizon-note','goal-line','baseline-note','assumption-note','month-detail','timing-note','income-note','eta-note','plan-summary','spending-limit'])$(id).textContent='';
 $('month-rows').replaceChildren();$('paths').hidden=true;$('try-once').disabled=$('try-monthly').disabled=true;
 $('chart').innerHTML='<p class="chart-empty">填齊數字後，呢度會顯示儲蓄走勢。</p>';
 $('chart-legend').replaceChildren();$('chart-period').textContent='';$('selected-month').textContent='選擇月份';
 $('month-detail').removeAttribute('aria-label');$('chart-month').disabled=true;$('chart-month').value='0';$('chart-month').removeAttribute('aria-valuetext');
 $('gap-label').textContent='仲差';$('dock-gap').textContent='填入條件開始試算';$('progress-fill').style.width='0%';$('progress').setAttribute('aria-valuenow','0');
}
function render(){
 $('ai-copy-panel').hidden=true;$('ai-copy-status').textContent='';
 $('shared-plan-banner').hidden=!sharedDraft;
 syncControls();$('example-status').textContent=(sharedDraft?'分享計劃 · 試玩中':mode==='example'?'虛構示例，可替換':'你的本機計劃')+(activePlan()?' · 含未確認收入試算':'');
 $('simple-plan-note').textContent=state.billSource==='legacy'?'快速估算：帳單按月總額計。Bonus 同稅金只計已填項目。':'';
 $('result-label').textContent=(activePlan()?'含試算 · ':'')+state.currency;
 $('reset-plan').hidden=!activePlan();const errors=[...G.validate(state),...G.validatePlan(plan)];$('status').textContent=errors.join(' ');
 if(errors.length){clearResult();persist();return;}
 base=G.forecast(state);result=G.forecast(state,plan);report=G.targetReport(state,result);trajectory=G.projectToGoal(state,plan);eta=trajectory.eta;
 const paydayPlan=payday.render(state,plan,result);
 $('ending').textContent=amount(result.ending);$('goal-line').textContent=`到 ${monthText(state.endMonth)}，我要儲 ${money(G.cents(state.goal),0)}`;
 $('gap-label').textContent=report.shortfall?'仲差':report.surplus?'超出目標':'剛好達標';$('shortfall').textContent=money(report.shortfall||report.surplus);
 const percent=G.cents(state.goal)>0?Math.max(0,Math.min(100,result.ending/G.cents(state.goal)*100)):(result.ending>=0?100:0);
 $('progress-fill').style.width=percent+'%';$('progress').setAttribute('aria-valuenow',percent.toFixed(1));
 $('eta').textContent=eta.reached?monthText(eta.month):'預測期內未達標';
 $('eta-note').textContent=`按月末結餘估算，最多10年。固定收支延續，Bonus 只計一次，不計回報／通脹。${eta.reached?'':'預測至'+monthText(eta.limitMonth)+'。'}${eta.reached&&eta.month<=state.endMonth&&report.shortfall?'首次達標後會回落，目標月結餘仍不足。':''}`;
 $('plan-summary').textContent=report.shortfall?'想準時儲夠，我可以揀一個方法試下：':'按呢個計劃，我可以準時儲夠。';
 $('paths').hidden=report.shortfall===0;
 $('try-once').disabled=report.shortfall===0||G.cents(plan.onceNet)+report.onceNeeded>1e10;
 $('try-monthly').disabled=report.shortfall===0||G.cents(plan.monthlyNet)+report.monthlyNeeded>1e10;
 $('once-needed').textContent=money(report.onceNeeded);$('monthly-needed').textContent=money(report.monthlyNeeded);
 $('spending-limit').textContent=report.shortfall?(report.spendingOnlyShortfall?`就算我日常使費減到0，仲差 ${money(report.spendingOnlyShortfall)}。`:`如果只慳使費，我每月要再少使 ${money(report.monthlyNeeded)}。`):'';
 $('baseline-note').textContent=activePlan()?`未加額外收入時，我會有 ${money(base.ending)}。而家試緊每月多 ${money(G.cents(plan.monthlyNet))}，到時再多 ${money(G.cents(plan.onceNet))}；呢啲錢未確認。`:`呢段時間，我會再儲到 ${money(result.growth)}。`;
 $('assumption-note').textContent=`已扣消費、所選月份帳單及稅金預留 ${money(result.totalTax,0)}。${G.utilityKeys.some(key=>Number(state.utilityPayments[key].amount)>0&&!state.utilityPayments[key].confirmed)?'含未核實水電煤付款月。':''}期末後帳單未扣；稅額非評稅結果。`;
 $('billsMonthly').textContent=money(result.totalBills);
 $('bills-subtotal-label').textContent='呢段時間我要交／留起';
 $('month-rows').innerHTML=result.rows.map((row,i)=>`<tr aria-selected="${i===selected}"><td><button type="button" data-month="${i}" aria-label="${row.month} 分角明細">${i===0||row.month.endsWith('-01')?'<span class="year">'+row.month.slice(0,4)+'</span>':''}${Number(row.month.slice(5))}月</button></td><td>${amount(row.savingsIn,0)}</td><td>${amount(row.bills,0)}</td><td>${row.tax?amount(row.tax,0):'—'}</td><td>${amount(row.balance,0)}</td></tr>`).join('');
 $('total-in').textContent=amount(result.totalSavingsIn,0);$('total-bills').textContent=amount(result.totalBills,0);$('total-tax').textContent=amount(result.totalTax,0);$('final-balance').textContent=amount(result.ending,0);
 $('table-note').textContent=`${state.currency}，四捨五入至元；點月份睇分角。入儲蓄已先扣個人消費。`;
 $('timing-note').textContent=`水電煤按所選付款月扣整筆；差餉／保險仍按月預留。${monthText(state.startMonth)}先預留全期稅金。`;
 $('income-note').textContent=`原定期間 ${result.rows.length} 個月；圖表共 ${trajectory.rows.length} 個月。${result.excludedOneOffs?'有 '+result.excludedOneOffs+' 筆一次性收入喺原定期限之外，未計入目標月結餘；延伸預測只喺實際入帳月計入。':''}${plan.onceNet?'新增一次性淨收入放喺目標月。':''}`;
 $('dock-monthly').textContent=money(paydayPlan.requiredMonthly);$('dock-gap').textContent='每月儲蓄目標'+(activePlan()?' · 含試算':'');$('dock-eta').textContent=eta.reached?monthText(eta.month):'預測期內未達標';
 renderChart();showMonth();visuals.render(state,result);$('visual-period').textContent=state.startMonth.replace('-','/')+' — '+state.endMonth.replace('-','/')+' · '+state.currency+' · 依輸入條件試算';persist();
}
function updateInput(input){
 if(input.id==='chart-month'){if(result){selected=Number(input.value);showMonth();}return;}
 if(input.id==='horizon-slider'){try{state.endMonth=G.shiftMonth(state.startMonth,Number(input.value)-1);mode='custom';}catch{return;}}
 else if(input.dataset.moneyKey){
  const key=input.dataset.moneyKey,value=MoneyControls.read(input);
  const income=I.findByControl(state,key);
  if(income){I.update(state,income.id,value);mode='custom';}
  else if(G.fields.includes(key)){state[key]=value;mode='custom';}
  else if(key==='monthlyNet'||key==='onceNet')plan[key]=value;
  else if(key==='bill-rates'){C.updateRates(state,value);mode='custom';}
  else if(key.startsWith('insurance-')){C.update(state,key.slice(10),'amount',value);mode='custom';}
  else if(key.startsWith('bill-')&&G.utilityKeys.includes(key.slice(5))){C.updateUtility(state,key.slice(5),'amount',value);mode='custom';}
  else if(key.startsWith('bill-')){B.update(state,key.slice(5),value);mode='custom';}
  else if(key.startsWith('oneoff-')){const row=state.oneOffs[Number(key.slice(7))];if(!row)return;row.amount=value;mode='custom';}
 }
 else if(input.dataset.utility){C.updateUtility(state,input.dataset.utility,input.dataset.paymentField,input.value);mode='custom';}
 else if(input.dataset.insuranceName){C.update(state,input.dataset.insuranceName,'name',input.value.slice(0,60));mode='custom';}
 else if(input.dataset.insuranceFrequency){C.update(state,input.dataset.insuranceFrequency,'frequency',input.value);mode='custom';}
 else if(input.dataset.incomeName){const row=state.incomeItems.find(row=>row.id===input.dataset.incomeName);if(!row)return;row.name=input.value.slice(0,60);mode='custom';}
 else if(input.dataset.field){state[input.dataset.field]=input.value;mode='custom';}
 else if(input.dataset.oneoff!==undefined){state.oneOffs[Number(input.dataset.oneoff)].month=input.value;mode='custom';}
 else return;
 render();
}
document.addEventListener('input',event=>updateInput(event.target));document.addEventListener('change',event=>updateInput(event.target));
// Choosing the zero end of an untouched blank field must also commit that zero.
document.addEventListener('pointerdown',event=>{if(event.target.matches('.money-control input[type=range]'))updateInput(event.target);});
document.addEventListener('keyup',event=>{if(event.target.matches('.money-control input[type=range]')&&['Home','End','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))updateInput(event.target);});
document.addEventListener('focusout',event=>{if(event.target.dataset.moneyKey){if(event.target.type==='text'){const raw=event.target.value,value=MoneyControls.parse(raw);event.target.value=value!==''&&Number.isFinite(value)?MoneyControls.format(value):raw;}render();}});
document.addEventListener('click',event=>{
 const hit=event.target.closest('[data-chart-month]');if(hit&&result){selected=Number(hit.dataset.chartMonth);showMonth();return;}
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.month!==undefined){selected=Number(button.dataset.month);showMonth();return;}
 if(button.dataset.chartMode){chartMode=button.dataset.chartMode;renderChart();showMonth();return;}
 if(button.dataset.expand){MoneyControls.expand(button.dataset.expand,ranges);syncControls();persist();return;}
 if(button.dataset.goal){state.goal=Number(button.dataset.goal);mode='custom';render();return;}
 if(button.id==='keep-shared-plan'){releaseInputFocus();sharedDraft=false;history.replaceState(null,'',location.pathname+'#goal');render();return;}
 if(button.id==='restore-local-plan'){releaseInputFocus();sharedDraft=false;state=C.initialise(I.initialise(B.setExample(G.example())));plan={monthlyNet:0,onceNet:0};ranges={};mode='example';try{if(savedBeforeShared){localStorage.setItem(storageKey,savedBeforeShared);readSaved();}else localStorage.removeItem(storageKey);}catch{}history.replaceState(null,'',location.pathname+'#goal');render();return;}
 if(button.id==='copy-ai'){copyForAI();return;}
 if(button.id==='close-ai-copy'){$('ai-copy-panel').hidden=true;$('copy-ai').focus();return;}
 if(button.id==='share-plan'){openShare();return;}
 if(button.id==='copy-share'){copyShare();return;}
 if(button.id==='close-share'){ $('share-panel').hidden=true;return;}
 if(button.id==='apply-example-bills'&&state.billSource==='legacy'&&G.cents(state.billsMonthly)===G.billTotal(B.example())){B.setExample(state);C.initialise(state);}
 else if(button.id==='load-example'){releaseInputFocus();sharedDraft=false;state=C.initialise(I.initialise(B.setExample(G.example())));plan={monthlyNet:0,onceNet:0};ranges={};mode='example';selected=Infinity;}
 else if(button.id==='clear-inputs'){releaseInputFocus();sharedDraft=false;state=C.initialise(I.initialise(B.setEmpty(G.blank())));plan={monthlyNet:0,onceNet:0};ranges={};mode='custom';selected=0;}
 else if(button.id==='try-once'&&report)plan.onceNet=(G.cents(plan.onceNet)+report.onceNeeded)/100;
 else if(button.id==='try-monthly'&&report)plan.monthlyNet=(G.cents(plan.monthlyNet)+report.monthlyNeeded)/100;
 else if(button.id==='reset-plan')plan={monthlyNet:0,onceNet:0};
 else if(button.id==='add-insurance'){const row=C.add(state);if(row){mode='custom';render();$('insurance-name-'+row.id).focus();}return;}
 else if(button.dataset.removeInsurance){delete ranges['insurance-'+button.dataset.removeInsurance];C.remove(state,button.dataset.removeInsurance);mode='custom';render();$('add-insurance').focus();return;}
 else if(button.id==='add-income'){const row=I.add(state);if(row){mode='custom';render();$('income-name-'+row.id).focus();}return;}
 else if(button.dataset.removeIncome){const row=state.incomeItems.find(row=>row.id===button.dataset.removeIncome);if(!row)return;delete ranges[I.control(row).key];I.remove(state,row.id);mode='custom';render();$('add-income').focus();return;}
 else if(button.id==='add-oneoff'&&state.oneOffs.length<12){state.oneOffs.push({amount:0,month:state.endMonth});mode='custom';}
 else if(button.dataset.remove!==undefined){state.oneOffs.splice(Number(button.dataset.remove),1);$('oneoffs').replaceChildren();mode='custom';}
 else return;
 render();
});
onboardingPending=!hasSavedPlan&&!sharedDraft;
render();
quickstart=PlannerQuickstart.create({
 hasSavedPlan,shared:()=>sharedDraft,
 readPlan:()=>({state:JSON.parse(JSON.stringify(state)),plan:{...plan}}),
 applyPlan:incoming=>{releaseInputFocus();onboardingPending=false;state=incoming.state;plan=incoming.plan;mode='custom';ranges={};selected=Infinity;render();}
});

function openShare(){
 try{
  const url=PlannerShare.url(state,plan,location.protocol==='file:'?PlannerConfig.publicUrl:location.origin+location.pathname);
  $('share-link').value=url;$('share-panel').hidden=false;$('share-copy-status').textContent='';$('share-link').focus();$('share-link').select();
 }catch{$('share-import-note').textContent='填齊有效金額同月份，先可以分享計劃。';}
}
async function copyShare(){
 try{await navigator.clipboard.writeText($('share-link').value);$('share-copy-status').textContent='連結已複製。';}
 catch{$('share-link').focus();$('share-link').select();$('share-copy-status').textContent='請長按或用複製快捷鍵，複製已選取嘅連結。';}
}

async function copyForAI(){
 let text;
 try{text=PlannerExport.text(state,plan);}
 catch{$('ai-copy-status').textContent='填齊有效金額同月份，先可以複製計劃畀 AI。';return;}
 const field=$('ai-plan-text');field.value=text;$('ai-copy-panel').hidden=true;
 try{await navigator.clipboard.writeText(text);$('ai-copy-status').textContent='計劃已複製，可以貼去 ChatGPT 或其他 AI 討論。';}
 catch{$('ai-copy-panel').hidden=false;field.focus();field.select();$('ai-copy-status').textContent='請長按或用複製快捷鍵，複製已選取嘅摘要，再貼去 AI。';}
}
