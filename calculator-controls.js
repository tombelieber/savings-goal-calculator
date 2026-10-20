(function(root){
 'use strict';
 const cap=1e8,configs=new Map();
 const format=value=>new Intl.NumberFormat('en-HK',{minimumFractionDigits:Number.isInteger(Number(value))?0:2,maximumFractionDigits:2}).format(Number(value));
 function parse(text){
  const value=String(text).trim().replace(/,/g,'');
  if(value==='')return '';
  return /^-?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(value)?Number(value):NaN;
 }
 function read(input){
  if(input.type==='range')return Number(input.value);
  const text=input.value,value=parse(text);if(value===''||!Number.isFinite(value))return value===''?'':text;
  const tail=(text.slice(input.selectionStart??text.length).match(/[^,]/g)||[]).length;
  const raw=text.trim().replace(/,/g,''),parts=raw.split('.');
  const whole=parts[0].replace(/^(-?)0+(?=\d)/,'$1').replace(/\B(?=(\d{3})+(?!\d))/g,',');
  const next=(whole===''?'0':whole==='-'?'-0':whole)+(parts.length>1?'.'+parts[1]:'');
  if(next!==text){
   input.value=next;let count=0,index=next.length;
   while(index>0&&count<tail){index--;if(next[index]!==',')count++;}
   input.setSelectionRange(index,index);
  }
  return value;
 }
 function mount(container,config){
  configs.set(config.key,config);
  const {id,key,label,detail='',rangeId,hint='',placeholder='0'}=config;
  const accessible=label+(detail?'（'+detail+'）':'');
  container.classList.add('money-control');
  container.innerHTML=`<div class="money-head"><label for="${rangeId}">${label}${detail?'<small>'+detail+'</small>':''}</label><div class="money-entry"><input id="${id}" data-money-key="${key}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="${accessible}，精確金額" placeholder="${placeholder}"><span class="input-mark" aria-hidden="true">✎</span></div></div><div class="slider-line"><input class="range" id="${rangeId}" data-money-key="${key}" type="range" min="0" max="${config.defaultMax}" step="0.01" value="0" aria-describedby="${id}-hint"><div class="range-foot"><span id="${id}-bounds"></span><button type="button" data-expand="${key}" aria-label="擴大${accessible} slider 範圍" title="擴大可調金額上限">範圍＋</button></div></div><p class="help" id="${id}-hint">${hint}</p>${key==='goal'?'<div class="goal-presets" role="group" aria-label="目標快捷金額">'+[[100000,'100k'],[500000,'500k'],[1000000,'1M'],[2000000,'2M'],[5000000,'5M'],[10000000,'10M']].map(([value,label])=>`<button type="button" data-goal="${value}" aria-pressed="false">${label}</button>`).join('')+'</div>':''}`;
 }
 function sync(input,value){if(document.activeElement!==input)input.value=String(value);}
 function render(key,value,ranges,currency){
  const config=configs.get(key),input=document.getElementById(config.id),slider=document.getElementById(config.rangeId);
  const numeric=root.SavingsCalculator.isAmount(value),valid=numeric&&Number(value)>=0&&Number(value)<=cap;
  const previous=ranges[key]||config.defaultMax;
  const maximum=Math.min(cap,Math.max(config.defaultMax,previous,valid?Math.ceil(Number(value)/1000)*1000:0));
  ranges[key]=maximum;slider.max=String(maximum);slider.min='0';
  sync(input,numeric?format(Number(value)):value);sync(slider,valid?Number(value):0);
  slider.setAttribute('aria-valuetext',valid?currency+' '+format(Number(value)):'請填0或以上有效金額');
  input.setAttribute('aria-invalid',String(value!==''&&!valid));
  document.getElementById(config.id+'-bounds').textContent='0 — '+format(maximum);
  document.querySelector(`[data-expand="${key}"]`).disabled=maximum===cap;
  if(key==='goal')for(const button of document.querySelectorAll('[data-goal]')){
   button.setAttribute('aria-pressed',String(valid&&Number(button.dataset.goal)===Number(value)));
   button.setAttribute('aria-label','目標 '+currency+' '+format(Number(button.dataset.goal)));
  }
 }
 function expand(key,ranges){const config=configs.get(key);if(!config)return;ranges[key]=Math.min(cap,(ranges[key]||config.defaultMax)*2);}
 root.MoneyControls={mount,render,expand,parse,read,format};
 if(typeof module!=='undefined')module.exports=root.MoneyControls;
})(typeof window==='undefined'?globalThis:window);
