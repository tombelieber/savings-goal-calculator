(function(root){
 'use strict';
 function create({readPlan,applyPlan,hasSavedPlan,shared}){
  const G=root.SavingsCalculator,Q=root.QuickPlan,M=root.MoneyControls,$=id=>document.getElementById(id),box=$('quickstart'),storageKey='savings-plan-quickstart-v1';
  const steps=[
   {key:'goal',title:'我要儲幾多？',help:'先揀一個目標，之後隨時可以改。',max:2000000,placeholder:'例如 300,000',presets:[[100000,'10萬'],[300000,'30萬'],[500000,'50萬'],[1000000,'100萬']]},
   {key:'months',title:'我想用幾耐儲到？',help:'由下個月開始計，先揀一個大概期限。',presets:[[6,'半年'],[12,'1年'],[24,'2年'],[36,'3年']]},
   {key:'startCash',title:'我而家已經儲咗幾多？',help:'填可以用嚟達標嘅錢，先扣起欠款同已預留嘅錢。',max:500000,placeholder:'未開始儲就填 0',zero:'我由 0 開始'},
   {key:'income',title:'我每個月收到幾多錢？',help:'人工加其他固定收入，填實際入帳總額。Bonus 之後先加。',max:200000,placeholder:'例如 30,000',zero:'我暫時冇固定收入'},
   {key:'spending',title:'我每個月日常使幾多？',help:'食飯、交通、購物等。租金同固定帳單留返下一題，唔使重複計。',max:100000,placeholder:'例如 5,000',zero:'呢項用 0 試算'},
   {key:'bills',title:'我嘅固定帳單點計？',help:'租金、水電煤、保費等，填總額或者逐項加，揀一種就得。',max:100000,placeholder:'例如 8,000',zero:'我冇固定帳單'},
   {key:'extra',optional:'income',title:'我仲有 Bonus／額外收入？',help:'只加未計入前面收入嘅錢，填到手金額。冇就略過。'}
  ];
  let snapshot=hasSavedPlan?readPlan():null,values=Q.seed(snapshot),extra=Q.details(snapshot),billMode=extra.costs.length?'detail':'total',step=0,view='full',ranges={},cached;
  try{cached=Q.cleanDraft(JSON.parse(localStorage.getItem(storageKey)));}catch{}
  const currency=()=>snapshot?.state.currency||'HKD';
  const details=root.QuickDetails.create({read:()=>extra,base:()=>Q.apply(snapshot,values),currency,changed:()=>{$('quick-error').textContent='';paint();remember();}});
  function remember(){try{localStorage.setItem(storageKey,JSON.stringify(view==='onboarding'?{version:3,view,step,values,details:extra,billMode}:{version:3,view}));$('quick-save-note').textContent='只存呢個瀏覽器，唔會上傳。';}catch{$('quick-save-note').textContent='目前未能儲存進度，關閉前請留意。';}}
  function setView(next){view=next;document.body.dataset.view=next;box.hidden=next!=='onboarding';}
  function showPlan(next='full',rememberChoice=true){setView(next);if(rememberChoice)remember();}
  function amountChanged(input){
   if(details.change(input))return;
   const key=input.dataset.quickKey;if(!key&&!Q.keys.includes(input.dataset.moneyKey?.slice(6)))return;
   if(key==='months')values.months=input.type==='range'?Number(input.value):input.value;
   else values[input.dataset.moneyKey.slice(6)]=M.read(input);
   $('quick-error').textContent='';paint();remember();
  }
  function paint(){
   const current=steps[step];document.body.dataset.quickCompact=String(Boolean(current.optional)||current.key==='bills');$('quick-count').textContent=current.optional?'選填 1 / 1':`${step+1} / 6`;
   $('quick-progress').setAttribute('aria-valuemax',String(steps.length));$('quick-progress').setAttribute('aria-valuenow',String(step+1));$('quick-progress-fill').style.width=((step+1)/steps.length*100)+'%';
   $('quick-title').textContent=current.title;$('quick-help').textContent=current.help;
   $('quick-back').hidden=step===0;$('quick-next').textContent=step===steps.length-1?'睇我嘅結果':current.optional?'繼續':'下一題';
   $('quick-optional-skip').hidden=!current.optional;$('quick-optional-skip').textContent=extra.incomeUsed?'保留原本收入，睇結果':'略過，直接睇結果';
   $('quick-zero').hidden=!current.zero;$('quick-zero').textContent=current.zero||'';
   $('quick-detail-note').textContent=step===5&&billMode==='total'?'按月總額估算，唔包括上一題日常使費。':'';
   if(snapshot&&step===3&&snapshot.state.incomeItems?.length>1)$('quick-detail-note').textContent='已帶入全部每月收入。改總額會取代原有收入拆項；想逐項改可以跳到完整工具。';
   if(snapshot&&step===5&&billMode==='total')$('quick-detail-note').textContent='每月總額會取代拆項，按月估算。';
   $('quick-bills-total').hidden=billMode!=='total';$('quick-bills-detail').hidden=billMode!=='detail';
   for(const button of box.querySelectorAll('[data-quick-bill-mode]'))button.setAttribute('aria-pressed',String(button.dataset.quickBillMode===billMode));
   for(const item of steps){
    $('quick-panel-'+item.key).hidden=item.key!==current.key;
    if(item.optional)continue;
    if(item.key==='months'){
     for(const id of ['quick-months','quick-months-slider'])if(document.activeElement!==$(id))$(id).value=Q.valid('months',values.months)?String(values.months):id.endsWith('slider')?'12':String(values.months);
     const start=snapshot?.state.startMonth||G.defaultMonths().startMonth;
     $('quick-until').textContent=Q.valid('months',values.months)?`${values.months} 個月，至 ${G.shiftMonth(start,Number(values.months)-1).replace('-','年')}月`:'';
    }else {M.render('quick-'+item.key,values[item.key],ranges,currency());$('quick-money-'+item.key).querySelector('.money-head label').textContent='金額 · '+currency();}
   }
   if(current.optional||current.key==='bills'&&billMode==='detail')details.render();
   for(const button of box.querySelectorAll('[data-quick-value]'))button.setAttribute('aria-pressed',String(Number(values[button.dataset.quickField])===Number(button.dataset.quickValue)));
  }
  function focusTitle(){$('quick-title').focus();}
  function finish(full){
   if(!full&&!Q.keys.every(key=>key==='bills'&&billMode==='detail'||Q.valid(key,values[key])))return;
   if(document.activeElement?.matches('input'))document.activeElement.blur();
   const chosen=JSON.parse(JSON.stringify(extra));chosen.costsUsed=billMode==='detail'&&(extra.costsUsed||!snapshot||snapshot.state.billSource==='legacy');
   if(full)for(const type of ['income','costs'])if(Q.detailError(snapshot,values,chosen,type))chosen[type+'Used']=false;
   applyPlan(Q.apply(snapshot,values,chosen,billMode));hasSavedPlan=true;showPlan(full?'full':'results');
   history.replaceState(null,'',location.pathname+(full?'#inputs':'#goal'));
   $(full?'inputs-title':'goal-title').focus();
  }
  function advance(){
   if(step===steps.length-1){finish(false);return;}step++;
   paint();remember();focusTitle();
  }
  function next(){
   const current=steps[step];
   if(current.optional||current.key==='bills'&&billMode==='detail'){
    const type=current.optional||'costs',error=type==='costs'&&!extra.costs.length?'請加一項帳單，或者選「我冇固定帳單」。':type==='costs'||extra.incomeUsed?Q.detailError(snapshot,values,extra,type):'';
    if(error){$('quick-error').textContent=error;const panel=$(type==='costs'?'quick-bills-detail':'quick-panel-'+current.key);(panel.querySelector('[aria-invalid=true]')||panel.querySelector('input')||$('quick-add-cost')).focus();return;}
   }else if(!Q.valid(current.key,values[current.key])){$('quick-error').textContent=current.key==='months'?'請填 1 至 60 個月。':'請填 0 或以上嘅金額，最多兩位小數。';$(current.key==='months'?'quick-months':'quick-'+current.key).focus();return;}
   advance();
  }
  for(const item of steps){
   if(item.key==='months'||item.optional)continue;
   M.mount($('quick-money-'+item.key),{key:'quick-'+item.key,id:'quick-'+item.key,rangeId:'quick-slider-'+item.key,label:'金額 · '+currency(),defaultMax:item.max,placeholder:item.placeholder});
  }
  for(const item of steps)if(item.presets){
   const group=$('quick-presets-'+item.key);
   for(const [value,label] of item.presets){const button=document.createElement('button');button.type='button';button.dataset.quickField=item.key;button.dataset.quickValue=value;button.textContent=label;group.appendChild(button);}
  }
  box.addEventListener('input',event=>{event.stopPropagation();if(event.target.matches('input'))amountChanged(event.target);});
  box.addEventListener('change',event=>{event.stopPropagation();if(event.target.matches('select'))details.change(event.target);});
  box.addEventListener('focusout',event=>{event.stopPropagation();if(event.target.dataset.moneyKey)paint();});
  for(const name of ['pointerdown','keyup'])box.addEventListener(name,event=>{event.stopPropagation();if(event.target.matches('.money-control input[type=range]')&&(name==='pointerdown'||['Home','End','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)))amountChanged(event.target);});
  box.addEventListener('click',event=>{
   event.stopPropagation();const button=event.target.closest('button');if(!button)return;
   if(details.click(button))return;
   if(button.id==='quick-skip')finish(true);
   else if(button.id==='quick-optional-skip'){extra.incomeUsed=false;extra.income=Q.details(snapshot).income;$('quick-income-rows').replaceChildren();$('quick-error').textContent='';advance();}
   else if(button.dataset.quickBillMode){
    const nextMode=button.dataset.quickBillMode;
    if(nextMode==='total'&&billMode==='detail'&&extra.costs.length&&!Q.detailError(snapshot,values,extra,'costs'))values.bills=Q.apply(snapshot,values,{...extra,incomeUsed:false,costsUsed:true}).state.billsMonthly;
    if(nextMode==='detail')extra.costsUsed=true;billMode=nextMode;$('quick-error').textContent='';paint();remember();
   }
   else if(button.id==='quick-back'){step=Math.max(0,step-1);$('quick-error').textContent='';paint();remember();focusTitle();}
   else if(button.id==='quick-zero'){if(steps[step].key==='bills')billMode='total';values[steps[step].key]=0;$('quick-error').textContent='';paint();remember();next();}
   else if(button.dataset.quickValue){values[button.dataset.quickField]=Number(button.dataset.quickValue);paint();remember();}
   else if(button.dataset.expand){M.expand(button.dataset.expand,ranges);paint();}
  });
  $('quick-form').addEventListener('submit',event=>{event.preventDefault();event.stopPropagation();next();});
  function start(){
   snapshot=hasSavedPlan||shared()?readPlan():null;values=Q.seed(snapshot);extra=Q.details(snapshot);billMode=extra.costs.length?'detail':'total';$('quick-income-rows').replaceChildren();$('quick-costs-rows').replaceChildren();step=0;setView('onboarding');history.replaceState(null,'',location.pathname);paint();remember();focusTitle();
  }
  $('start-quick').addEventListener('click',start);
  window.addEventListener('hashchange',()=>{if(location.hash==='#start')start();});
  document.addEventListener('click',event=>{
   const link=event.target.closest('a');
   if(['#inputs','#housing-section','#income-section','#oneoffs-section','#tax-section','#insurance-section'].includes(link?.getAttribute('href')))showPlan('full',!shared());
   const action=event.target.closest('[data-add-from-result]');if(!action)return;
   showPlan('full',!shared());const income=action.dataset.addFromResult==='income',add=$(income?'add-income':'add-oneoff');
   if(add.disabled){$(income?'incomes-summary':'oneoffs-summary').scrollIntoView({block:'start'});return;}
   add.click();
   if(!income){const input=$('oneoffs').lastElementChild?.querySelector('input[data-money-key]');input?.focus();}
  });
  if(shared())setView('results');
  else if(location.hash==='#start'){setView('onboarding');history.replaceState(null,'',location.pathname);}
  else if(cached?.view==='onboarding'){values=cached.values;extra=cached.details||Q.details(snapshot);billMode=cached.billMode||(extra.costsUsed?'detail':snapshot&&G.cents(cached.values.bills)!==G.cents(snapshot.state.billsMonthly)?'total':billMode);step=cached.step;setView('onboarding');}
  else if(hasSavedPlan)setView(cached?.view||'full');
  else setView('onboarding');
  paint();
  return {showPlan};
 }
 root.PlannerQuickstart={create};
})(typeof window==='undefined'?globalThis:window);
